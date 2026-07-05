import { useGetProposalsSummary, useListProposals } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { FileText, CheckCircle2, XCircle, Clock, Activity, Zap, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export function getStatusColor(status: string) {
  switch (status) {
    case "active":   return "bg-amber-500/12 text-amber-400 border-amber-500/25";
    case "passed":   return "bg-green-500/12 text-green-400 border-green-500/25";
    case "failed":   return "bg-red-500/12 text-red-400 border-red-500/25";
    case "pending":  return "bg-slate-500/12 text-slate-400 border-slate-500/25";
    case "cancelled":return "bg-gray-500/10 text-gray-500 border-gray-600/20";
    default:         return "bg-primary/10 text-primary border-primary/20";
  }
}

const stagger = {
  animate: { transition: { staggerChildren: 0.07 } },
};
const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22,1,0.36,1] } },
};

const statCards = [
  {
    key: "total",
    label: "Total Proposals",
    icon: FileText,
    colorClass: "text-slate-400",
    active: false,
  },
  {
    key: "active",
    label: "Active",
    icon: Activity,
    colorClass: "text-amber-400",
    active: true,
  },
  {
    key: "passed",
    label: "Passed",
    icon: CheckCircle2,
    colorClass: "text-green-400",
    active: false,
  },
  {
    key: "failed",
    label: "Failed",
    icon: XCircle,
    colorClass: "text-red-400",
    active: false,
  },
];

const networks = [
  { label: "Avalanche C-Chain", status: "online" },
  { label: "Ethereum Mainnet",  status: "online" },
  { label: "Arbitrum One",      status: "online" },
  { label: "Base",              status: "online" },
];

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { data: summary, isLoading: isLoadingSummary } = useGetProposalsSummary();
  const { data: activeProposals, isLoading: isLoadingProposals } = useListProposals({ status: "active" });

  const summaryValues: Record<string, number> = {
    total:  summary?.total  || 0,
    active: summary?.active || 0,
    passed: summary?.passed || 0,
    failed: summary?.failed || 0,
  };

  return (
    <div className="space-y-8 md:space-y-10 max-w-6xl mx-auto">

      {/* ── Hero heading ─────────────────────────────────────────────────── */}
      <motion.div variants={fadeUp} initial="initial" animate="animate">
        <div className="flex items-start gap-3 mb-1">
          <div
            className="mt-1 p-1.5 rounded-lg shrink-0"
            style={{ background: "rgba(212,147,26,0.12)", border: "1px solid rgba(212,147,26,0.2)" }}
          >
            <Zap size={16} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight">Command Center</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-0.5">
              Platform-wide governance overview and active operations.
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <motion.div
        className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4"
        variants={stagger}
        initial="initial"
        animate="animate"
      >
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.key}
              variants={fadeUp}
              className={`grad-border ${card.active ? "grad-border-active" : ""}`}
            >
              <div
                className="rounded-xl h-full p-4 md:p-5 flex flex-col gap-3 relative overflow-hidden"
                style={{ background: "rgba(11,26,50,0.85)" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
                  <Icon size={16} className={card.colorClass} strokeWidth={1.8} />
                </div>
                {isLoadingSummary ? (
                  <Skeleton className="h-9 w-16" />
                ) : (
                  <span
                    className={`text-3xl md:text-4xl font-bold tracking-tight ${card.active ? "gold-text" : "text-foreground"}`}
                  >
                    {summaryValues[card.key]}
                  </span>
                )}
                {card.active && (
                  <div
                    className="absolute inset-0 rounded-xl pointer-events-none"
                    style={{ background: "radial-gradient(ellipse at top right, rgba(212,147,26,0.06), transparent 65%)" }}
                  />
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="grid gap-6 md:gap-8 md:grid-cols-3">

        {/* Active proposals list */}
        <motion.div
          className="md:col-span-2 space-y-4"
          variants={stagger}
          initial="initial"
          animate="animate"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base md:text-lg font-bold tracking-tight">Active Proposals</h2>
            <Link
              href="/proposals"
              className="flex items-center gap-1 text-xs font-medium transition-colors"
              style={{ color: "#D4931A" }}
            >
              View all <ChevronRight size={14} />
            </Link>
          </div>

          {isLoadingProposals ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
            </div>
          ) : activeProposals?.length === 0 ? (
            <motion.div variants={fadeUp}>
              <div
                className="rounded-xl border border-dashed border-border/60 flex flex-col items-center justify-center h-44 text-muted-foreground"
              >
                <Activity size={28} className="mb-3 opacity-30" />
                <p className="text-sm">No active proposals at this time.</p>
              </div>
            </motion.div>
          ) : (
            activeProposals?.map(proposal => {
              const totalVotes = (proposal.votesFor || 0) + (proposal.votesAgainst || 0) + (proposal.votesAbstain || 0);
              const forPercent = totalVotes > 0 ? ((proposal.votesFor || 0) / totalVotes) * 100 : 0;
              const againstPercent = totalVotes > 0 ? ((proposal.votesAgainst || 0) / totalVotes) * 100 : 0;
              const abstainPercent = totalVotes > 0 ? ((proposal.votesAbstain || 0) / totalVotes) * 100 : 0;
              return (
                <motion.div key={proposal.id} variants={fadeUp}>
                  <div
                    className="rounded-xl p-4 md:p-5 card-hover-glow cursor-pointer group"
                    style={{
                      background: "rgba(11,26,50,0.8)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                    onClick={() => navigate(`/proposals/${proposal.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === "Enter" && navigate(`/proposals/${proposal.id}`)}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <button
                            className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors"
                            onClick={e => { e.stopPropagation(); navigate(`/projects/${proposal.projectId}`); }}
                          >
                            {proposal.projectName}
                          </button>
                          <Badge variant="outline" className={`text-[10px] px-2 py-0 ${getStatusColor(proposal.status)}`}>
                            {proposal.status.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="font-semibold text-sm md:text-base leading-snug text-foreground group-hover:text-amber-300 transition-colors line-clamp-2">
                          {proposal.title}
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0 mt-0.5" />
                    </div>

                    {/* Mini vote bar */}
                    <div className="space-y-1.5">
                      <div className="h-1.5 w-full rounded-full overflow-hidden flex" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <div className="h-full vote-bar-for transition-all" style={{ width: `${forPercent}%` }} />
                        <div className="h-full vote-bar-against transition-all" style={{ width: `${againstPercent}%` }} />
                        <div className="h-full vote-bar-abstain transition-all" style={{ width: `${abstainPercent}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock size={11} />
                          <span>Ends {new Date(proposal.endDate).toLocaleDateString()}</span>
                        </div>
                        <span>{totalVotes} votes</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </motion.div>

        {/* System status */}
        <motion.div variants={fadeUp} initial="initial" animate="animate" className="space-y-4">
          <h2 className="text-base md:text-lg font-bold tracking-tight">System Status</h2>
          <div
            className="rounded-xl p-5 space-y-0"
            style={{
              background: "rgba(11,26,50,0.8)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            {networks.map((net, i) => (
              <div
                key={net.label}
                className="flex items-center justify-between py-3"
                style={{ borderBottom: i < networks.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-2 w-2 rounded-full bg-green-400 shrink-0 dot-online"
                    style={{ boxShadow: "0 0 6px rgba(74,222,128,0.5)" }}
                  />
                  <span className="text-sm font-medium">{net.label}</span>
                </div>
                <span
                  className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(74,222,128,0.1)",
                    color: "rgba(74,222,128,0.9)",
                    border: "1px solid rgba(74,222,128,0.2)",
                  }}
                >
                  LIVE
                </span>
              </div>
            ))}

            <div
              className="mt-4 pt-4 text-xs text-muted-foreground leading-relaxed"
              style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
            >
              Governance actions are secured by cryptographic signatures. Connect your wallet to participate in active proposals.
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
