import { calculatePercentage } from "./utils";

const DEPLETED_THRESHOLD = 5; // percent remaining

/**
 * Group connections by provider field.
 * @param {Array} connections - Array of connection objects
 * @returns {{ [provider: string]: Array }} Connections grouped by provider
 */
export function groupConnectionsByProvider(connections) {
  const groups = {};
  for (const conn of connections) {
    const key = conn.provider;
    if (!groups[key]) groups[key] = [];
    groups[key].push(conn);
  }
  return groups;
}

/**
 * Classify a single account's status based on its quota data and error state.
 * @param {object} conn - Connection object
 * @param {object|null} accountQuota - quotaData[conn.id] (parsed quota result)
 * @param {string|null} accountError - errors[conn.id]
 * @returns {"active" | "exhausted" | "banned" | "unavailable"}
 */
export function classifyAccountStatus(conn, accountQuota, accountError) {
  // Banned/disabled by user
  if (conn.isActive === false) return "banned";

  // Has error or no quota data available
  if (accountError) return "unavailable";
  if (!accountQuota || (!accountQuota.quotas?.length && accountQuota.message)) return "unavailable";

  // No quotas parsed (but no error either) — treat as unavailable
  if (!accountQuota.quotas || accountQuota.quotas.length === 0) return "unavailable";

  // Check if ALL quotas are depleted
  const allDepleted = accountQuota.quotas.every((q) => {
    if (!q.total || q.total <= 0) return false; // skip unlimited/unknown
    const remaining = q.remainingPercentage !== undefined
      ? q.remainingPercentage
      : calculatePercentage(q.used, q.total);
    return remaining <= DEPLETED_THRESHOLD;
  });

  return allDepleted ? "exhausted" : "active";
}

/**
 * Aggregate quota data across multiple accounts for one provider.
 * Sums `used` and `total` per quota name across accounts.
 * Takes earliest `resetAt` per quota name.
 * Computes account stats (total, active, exhausted, banned, unavailable).
 *
 * @param {Array} providerConnections - All connections for this provider
 * @param {object} quotaData - Full quotaData state { [connectionId]: { quotas, plan, message } }
 * @param {object} errors - Full errors state { [connectionId]: string }
 * @returns {{ quotas: Array, accountStats: object, plan: string|null }}
 */
export function aggregateQuotasForProvider(providerConnections, quotaData, errors) {
  const accountStats = { total: 0, active: 0, exhausted: 0, banned: 0, unavailable: 0 };
  const quotaMap = {}; // { [quotaName]: { used, total, resetAt } }
  let plan = null;

  for (const conn of providerConnections) {
    accountStats.total++;

    const accountQuota = quotaData[conn.id] || null;
    const accountError = errors[conn.id] || null;
    const status = classifyAccountStatus(conn, accountQuota, accountError);
    accountStats[status]++;

    // Capture plan from first account that has one
    if (!plan && accountQuota?.plan) {
      plan = accountQuota.plan;
    }

    // Only aggregate quota numbers from accounts that have data
    // Skip banned and unavailable — they don't contribute to capacity
    if (status === "banned" || status === "unavailable") continue;
    if (!accountQuota?.quotas?.length) continue;

    for (const q of accountQuota.quotas) {
      const name = q.name;
      if (!name) continue;

      if (!quotaMap[name]) {
        quotaMap[name] = { used: 0, total: 0, resetAt: null };
      }

      quotaMap[name].used += q.used || 0;
      quotaMap[name].total += q.total || 0;

      // Keep earliest resetAt
      if (q.resetAt) {
        const existing = quotaMap[name].resetAt;
        if (!existing || new Date(q.resetAt) < new Date(existing)) {
          quotaMap[name].resetAt = q.resetAt;
        }
      }
    }
  }

  // Convert map to sorted array (preserve insertion order which follows PROVIDER_MODELS)
  const quotas = Object.entries(quotaMap).map(([name, data]) => ({
    name,
    used: data.used,
    total: data.total,
    resetAt: data.resetAt,
  }));

  return { quotas, accountStats, plan };
}
