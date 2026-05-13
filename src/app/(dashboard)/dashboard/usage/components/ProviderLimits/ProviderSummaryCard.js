"use client";

import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Card from "@/shared/components/Card";
import Badge from "@/shared/components/Badge";
import ProviderIcon from "@/shared/components/ProviderIcon";
import QuotaTable from "./QuotaTable";

/**
 * ProviderSummaryCard - Aggregated quota card for a single provider.
 * Shows total quota across all accounts with account status badges.
 * During refresh, keeps stale data visible with a subtle loading overlay.
 *
 * @param {object} props
 * @param {string} props.provider - Provider ID (e.g. "antigravity", "codex")
 * @param {Array} props.quotas - Aggregated quota array [{name, used, total, resetAt}]
 * @param {object} props.accountStats - { total, active, exhausted, banned, unavailable }
 * @param {string|null} props.plan - Plan name (e.g. "Free", "Pro")
 * @param {boolean} props.loading - Whether quota data is still loading
 * @param {function} props.onRefresh - Callback to refresh all accounts for this provider
 * @param {function} props.onSelect - Callback when user clicks to drill down into provider
 */
export default function ProviderSummaryCard({
  provider,
  quotas = [],
  accountStats = {},
  plan = null,
  loading = false,
  onRefresh,
  onSelect,
}) {
  const { total = 0, active = 0, exhausted = 0, banned = 0, unavailable = 0 } = accountStats;
  const prevQuotasRef = useRef(quotas);

  // Keep showing previous data while loading new data
  const displayQuotas = quotas.length > 0 ? quotas : prevQuotasRef.current;
  if (quotas.length > 0) {
    prevQuotasRef.current = quotas;
  }

  const hasData = displayQuotas.length > 0;
  const isInitialLoad = loading && !hasData;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <Card
        padding="none"
        hover
        className="min-w-0 cursor-pointer overflow-hidden"
        onClick={onSelect}
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-black/10 dark:border-white/10">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 shrink-0 rounded-md flex items-center justify-center overflow-hidden">
                <ProviderIcon
                  src={`/providers/${provider}.png`}
                  alt={provider}
                  size={32}
                  className="object-contain"
                  fallbackText={provider?.slice(0, 2).toUpperCase() || "PR"}
                />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-text-primary capitalize truncate">
                  {provider}
                </h3>
                {plan && (
                  <span className="text-[10px] text-text-muted">{plan}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Refresh button with spin animation */}
              <motion.button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRefresh?.();
                }}
                disabled={loading}
                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
                title="Refresh all accounts"
                animate={loading ? { rotate: 360 } : { rotate: 0 }}
                transition={loading ? { duration: 1, repeat: Infinity, ease: "linear" } : { duration: 0.3 }}
              >
                <span className="material-symbols-outlined text-[18px] text-text-muted">
                  refresh
                </span>
              </motion.button>
              {/* Drill-down indicator */}
              <span className="material-symbols-outlined text-[16px] text-text-muted">
                chevron_right
              </span>
            </div>
          </div>

          {/* Account stats badges */}
          <div className="flex flex-wrap items-center gap-1 mt-1.5">
            <Badge variant="default" size="sm">
              {total} Total
            </Badge>
            {active > 0 && (
              <Badge variant="success" size="sm" dot>
                {active} Active
              </Badge>
            )}
            {exhausted > 0 && (
              <Badge variant="error" size="sm" dot>
                {exhausted} Exhausted
              </Badge>
            )}
            {banned > 0 && (
              <Badge variant="default" size="sm" dot>
                {banned} Banned
              </Badge>
            )}
            {unavailable > 0 && (
              <Badge variant="warning" size="sm" dot>
                {unavailable} Unavailable
              </Badge>
            )}
          </div>
        </div>

        {/* Body - Aggregated quota table with loading overlay */}
        <div className="px-2 py-1.5 relative">
          <AnimatePresence mode="wait">
            {isInitialLoad ? (
              /* Initial load: show skeleton pulse */
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-2 py-3 px-2"
              >
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-text-muted/20 animate-pulse" />
                    <div className="h-3 flex-1 rounded bg-text-muted/10 animate-pulse" />
                    <div className="h-3 w-12 rounded bg-text-muted/10 animate-pulse" />
                  </div>
                ))}
              </motion.div>
            ) : hasData ? (
              /* Has data: show quota table, with subtle overlay when refreshing */
              <motion.div
                key="data"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div
                  animate={{ opacity: loading ? 0.5 : 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <QuotaTable quotas={displayQuotas} compact />
                </motion.div>

                {/* Subtle loading shimmer overlay */}
                <AnimatePresence>
                  {loading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0 pointer-events-none"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              /* No data at all */
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="text-center py-4"
              >
                <p className="text-xs text-text-muted">No quota data available</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  );
}
