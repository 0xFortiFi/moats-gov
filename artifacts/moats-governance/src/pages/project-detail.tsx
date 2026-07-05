import { useRoute, useLocation } from "wouter";
import { useGetProject, useGetProjectLeaderboard, useListProposals, getGetProjectQueryKey, getGetProjectLeaderboardQueryKey, getListProposalsQueryKey } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, Clock, Trophy, ExternalLink, Shield, ChevronRight, Copy } from "lucide-react";
import { getStatusColor } from "./dashboard";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22,1,0.36,1] as [number,number,number,number] } },
};

const rankColors = ["#D4931A", "#94a3b8", "#92400e"];
const rankGlows  = ["rgba(212,147,26,0.35)", "rgba(148,163,184,0.25)", "rgba(146,64,14,0.25)"];

export default function ProjectDetail() {
  const [, params] = useRoute("/projects/:id");
  const [, navigate] = useLocation();
  const projectId = params?.id ? parseInt(params.id, 10) : 0;
  const { toast } = useToast();

  const { data: project, isLoading: isLoadingProject } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) }
  });

  const { data: leaderboard, isLoading: isLoadingLeaderboard } = useGetProjectLeaderboard(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectLeaderboardQueryKey(projectId) }
  });

  const { data: proposals, isLoading: isLoadingProposals } = useListProposals({ projectId }, {
    query: { enabled: !!projectId, queryKey: getListProposalsQueryKey({ projectId }) }
  });

  if (isLoadingProject) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <Skeleton className="h-12 w-64 rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="md:col-span-2 h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!project) {
    return <div className="text-center py-20 text-muted-foreground">Project not found.</div>;
  }

  const copyAddress = () => {
    navigator.clipboard.writeText(project.contractAddress);
    toast({ title: "Address copied" });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* ── Project hero ─────────────────────────────────────────────────── */}
      <motion.div variants={fadeUp} initial="initial" animate="animate">
        <div
          className="rounded-2xl p-6 md:p-8 relative overflow-hidden"
          style={{
            background: "rgba(11,26,50,0.85)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 70% 60% at 95% 5%, rgba(212,147,26,0.055), transparent 60%)" }}
          />
          <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex items-start gap-4">
              <div
                className="h-14 w-14 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                style={{ background: "rgba(212,147,26,0.1)", border: "1.5px solid rgba(212,147,26,0.22)" }}
              >
                {project.logoUrl ? (
                  <img
                    src={project.logoUrl}
                    alt={`${project.name} logo`}
                    className="h-full w-full object-cover"
                    onError={e => {
                      const el = e.currentTarget;
                      el.style.display = "none";
                      el.nextElementSibling?.classList.remove("hidden");
                    }}
                  />
                ) : null}
                <span className={`text-xl font-bold gold-text ${project.logoUrl ? "hidden" : ""}`}>
                  {project.name.charAt(0)}
                </span>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">{project.name}</h1>
                <button
                  className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-primary transition-colors group"
                  onClick={copyAddress}
                >
                  <Shield size={12} className="text-primary/50" />
                  <span>{project.contractAddress.slice(0, 10)}…{project.contractAddress.slice(-6)}</span>
                  <Copy size={10} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                  <ExternalLink size={10} className="opacity-40" />
                </button>
              </div>
            </div>

            <div className="flex gap-3 shrink-0">
              <div
                className="px-4 py-2.5 rounded-xl text-center min-w-[72px]"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total</div>
                <div className="font-mono text-xl font-bold">{project.totalProposals || 0}</div>
              </div>
              <div
                className="px-4 py-2.5 rounded-xl text-center min-w-[72px]"
                style={{
                  background: "rgba(212,147,26,0.08)",
                  border: "1px solid rgba(212,147,26,0.22)",
                  boxShadow: "0 0 16px rgba(212,147,26,0.08)",
                }}
              >
                <div className="text-[10px] text-amber-400/70 uppercase tracking-wider mb-1">Active</div>
                <div className="font-mono text-xl font-bold" style={{ color: "#D4931A" }}>
                  {project.activeProposals || 0}
                </div>
              </div>
            </div>
          </div>

          {project.description && (
            <p className="relative mt-5 pt-5 text-sm text-muted-foreground leading-relaxed" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              {project.description}
            </p>
          )}
        </div>
      </motion.div>

      {/* ── Two-column layout: Proposals (left) + Leaderboard (right) ─────── */}
      <motion.div variants={fadeUp} initial="initial" animate="animate">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

          {/* ── Proposals column (2/3 width on desktop) ─────────────────── */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={15} className="text-amber-400/70" />
              <h2 className="font-semibold text-sm">Proposals</h2>
              {proposals && proposals.length > 0 && (
                <span
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded-md"
                  style={{ background: "rgba(212,147,26,0.12)", color: "#D4931A" }}
                >
                  {proposals.length}
                </span>
              )}
            </div>

            {isLoadingProposals ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
              </div>
            ) : proposals?.length === 0 ? (
              <div
                className="rounded-xl border border-dashed border-border/50 flex flex-col items-center justify-center h-44 text-muted-foreground"
              >
                <Activity size={28} className="mb-3 opacity-25" />
                <p className="text-sm">No proposals for this project yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {proposals?.map(proposal => (
                  <div
                    key={proposal.id}
                    className="rounded-xl p-4 md:p-5 flex items-center gap-4 card-hover-glow cursor-pointer group"
                    style={{ background: "rgba(11,26,50,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}
                    onClick={() => navigate(`/proposals/${proposal.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === "Enter" && navigate(`/proposals/${proposal.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2 py-0 h-5 ${getStatusColor(proposal.status)}`}
                        >
                          {proposal.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="font-semibold text-sm leading-snug text-foreground group-hover:text-amber-300 transition-colors line-clamp-1">
                        {proposal.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] font-mono text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          Ends {new Date(proposal.endDate).toLocaleDateString()}
                        </span>
                        <span>Quorum: {proposal.quorumThreshold}%</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Leaderboard column (1/3 width on desktop) ───────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={15} className="text-amber-400" />
              <h2 className="font-semibold text-sm">Top Delegates</h2>
            </div>

            <div
              className="rounded-xl overflow-hidden"
              style={{ background: "rgba(11,26,50,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              {isLoadingLeaderboard ? (
                <div className="p-5 space-y-2.5">
                  {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
                </div>
              ) : leaderboard?.length === 0 ? (
                <div className="text-center py-10 px-5 text-muted-foreground text-sm">
                  No Moat Points distributed yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                      <TableHead className="w-12 text-xs pl-4">Rank</TableHead>
                      <TableHead className="text-xs">Wallet</TableHead>
                      <TableHead className="text-right text-xs pr-4">Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboard?.map(entry => {
                      const rank = entry.rank ?? 0;
                      const wallet = entry.walletAddress ?? "";
                      return (
                      <TableRow key={wallet || rank} style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                        <TableCell className="pl-4">
                          <span
                            className="font-mono text-sm font-bold"
                            style={{
                              color: rank <= 3 && rank > 0 ? rankColors[rank - 1] : "rgba(148,163,184,0.6)",
                              textShadow: rank <= 3 && rank > 0 ? `0 0 8px ${rankGlows[rank - 1]}` : "none",
                            }}
                          >
                            {rank <= 3 && rank > 0 ? ["🥇","🥈","🥉"][rank - 1] : `#${rank}`}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-sm pr-4" style={{ color: "#D4931A" }}>
                          {entry.points.toLocaleString()}
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
