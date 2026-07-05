import { useRoute } from "wouter";
import { useGetProject, useGetProjectLeaderboard, useListProposals, getGetProjectQueryKey, getGetProjectLeaderboardQueryKey, getListProposalsQueryKey } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "wouter";
import { Activity, Clock, Trophy, ExternalLink, Shield, ChevronRight, Copy } from "lucide-react";
import { getStatusColor } from "./dashboard";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22,1,0.36,1] } },
};

const rankColors = ["#D4931A", "#94a3b8", "#92400e"];
const rankGlows  = ["rgba(212,147,26,0.35)", "rgba(148,163,184,0.25)", "rgba(146,64,14,0.25)"];

export default function ProjectDetail() {
  const [, params] = useRoute("/projects/:id");
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
        <Skeleton className="h-72 w-full rounded-xl" />
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
                className="h-14 w-14 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(212,147,26,0.1)", border: "1.5px solid rgba(212,147,26,0.22)" }}
              >
                <span className="text-xl font-bold gold-text">{project.name.charAt(0)}</span>
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

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <motion.div variants={fadeUp} initial="initial" animate="animate">
        <Tabs defaultValue="proposals" className="w-full">
          <TabsList
            className="w-full justify-start bg-transparent rounded-none h-11 p-0 mb-5"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
          >
            <TabsTrigger
              value="proposals"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-0 h-full mr-6 text-sm font-medium"
            >
              Proposals
            </TabsTrigger>
            <TabsTrigger
              value="leaderboard"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-0 h-full text-sm font-medium"
            >
              Moat Points Leaderboard
            </TabsTrigger>
          </TabsList>

          {/* Proposals tab */}
          <TabsContent value="proposals">
            {isLoadingProposals ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
              </div>
            ) : proposals?.length === 0 ? (
              <div
                className="rounded-xl border border-dashed border-border/50 flex flex-col items-center justify-center h-44 text-muted-foreground"
              >
                <Activity size={28} className="mb-3 opacity-25" />
                <p className="text-sm">No proposals found for this project.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {proposals?.map(proposal => (
                  <Link key={proposal.id} href={`/proposals/${proposal.id}`} className="block group">
                    <div
                      className="rounded-xl p-4 md:p-5 flex items-center gap-4 card-hover-glow cursor-pointer"
                      style={{ background: "rgba(11,26,50,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}
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
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Leaderboard tab */}
          <TabsContent value="leaderboard">
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: "rgba(11,26,50,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div
                className="px-5 md:px-6 py-4 flex items-center gap-2"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <Trophy size={16} className="text-amber-400" />
                <h2 className="font-semibold text-sm">Top Delegates</h2>
              </div>
              <div className="p-5 md:p-6">
                {isLoadingLeaderboard ? (
                  <div className="space-y-2.5">
                    {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
                  </div>
                ) : leaderboard?.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm">
                    No Moat Points distributed yet.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                        <TableHead className="w-16 text-xs">Rank</TableHead>
                        <TableHead className="text-xs">Wallet</TableHead>
                        <TableHead className="text-right text-xs">Moat Points</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaderboard?.map(entry => (
                        <TableRow key={entry.walletAddress} style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                          <TableCell>
                            <span
                              className="font-mono text-sm font-bold"
                              style={{
                                color: entry.rank <= 3 ? rankColors[entry.rank - 1] : "rgba(148,163,184,0.6)",
                                textShadow: entry.rank <= 3 ? `0 0 8px ${rankGlows[entry.rank - 1]}` : "none",
                              }}
                            >
                              {entry.rank <= 3 ? ["🥇","🥈","🥉"][entry.rank - 1] : `#${entry.rank}`}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {entry.walletAddress.slice(0, 8)}…{entry.walletAddress.slice(-6)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-sm" style={{ color: "#D4931A" }}>
                            {entry.points.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
