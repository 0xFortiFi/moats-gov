import { useState } from "react";
import { useListProposals, useListProjects, ListProposalsStatus } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useLocation } from "wouter";
import { Clock, Activity, Search, FilterX, ChevronRight, FileText, TrendingUp } from "lucide-react";
import { getStatusColor } from "./dashboard";
import React from "react";
import { motion } from "framer-motion";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.22,1,0.36,1] as [number,number,number,number] } },
};
const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active:    "#F0B429",
    passed:    "#4ade80",
    failed:    "#f87171",
    pending:   "#94a3b8",
    cancelled: "#64748b",
  };
  return (
    <span
      className="h-1.5 w-1.5 rounded-full shrink-0 mt-0.5"
      style={{ background: colors[status] || "#D4931A", boxShadow: `0 0 5px ${colors[status] || "#D4931A"}66` }}
    />
  );
}

export default function Proposals() {
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = React.useState<ListProposalsStatus | "all">("all");
  const [projectFilter, setProjectFilter] = React.useState<string>("all");
  const [search, setSearch] = React.useState("");

  const { data: projects } = useListProjects();

  const queryParams: any = {};
  if (statusFilter !== "all") queryParams.status = statusFilter;
  if (projectFilter !== "all") queryParams.projectId = parseInt(projectFilter, 10);

  const { data: proposals, isLoading: isLoadingProposals } = useListProposals(queryParams);

  const filteredProposals = proposals?.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  const hasFilters = statusFilter !== "all" || projectFilter !== "all" || search;

  return (
    <div className="space-y-7 md:space-y-9 max-w-6xl mx-auto">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <motion.div variants={fadeUp} initial="initial" animate="animate">
        <div className="flex items-start gap-3 mb-1">
          <div
            className="mt-1 p-1.5 rounded-lg shrink-0"
            style={{ background: "rgba(212,147,26,0.12)", border: "1px solid rgba(212,147,26,0.2)" }}
          >
            <FileText size={16} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Proposals</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-0.5">Browse and vote on governance proposals.</p>
          </div>
        </div>
      </motion.div>

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <motion.div variants={fadeUp} initial="initial" animate="animate" className="space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input
            placeholder="Search proposals…"
            className="pl-10 h-11 text-sm"
            style={{ background: "rgba(11,26,50,0.8)", borderColor: "rgba(255,255,255,0.08)" }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter as string} onValueChange={v => setStatusFilter(v as any)}>
            <SelectTrigger
              className="flex-1 h-10 text-sm"
              style={{ background: "rgba(11,26,50,0.8)", borderColor: "rgba(255,255,255,0.08)" }}
            >
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="passed">Passed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger
              className="flex-1 h-10 text-sm"
              style={{ background: "rgba(11,26,50,0.8)", borderColor: "rgba(255,255,255,0.08)" }}
            >
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects?.map(p => (
                <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasFilters && (
            <button
              onClick={() => { setStatusFilter("all"); setProjectFilter("all"); setSearch(""); }}
              className="p-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground shrink-0"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              title="Clear filters"
            >
              <FilterX size={17} />
            </button>
          )}
        </div>
        {filteredProposals && (
          <p className="text-xs text-muted-foreground pl-1">
            {filteredProposals.length} proposal{filteredProposals.length !== 1 ? "s" : ""} found
          </p>
        )}
      </motion.div>

      {/* ── Proposal cards ───────────────────────────────────────────────── */}
      {isLoadingProposals ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}
        </div>
      ) : filteredProposals?.length === 0 ? (
        <motion.div variants={fadeUp} initial="initial" animate="animate">
          <div
            className="rounded-xl border border-dashed border-border/50 flex flex-col items-center justify-center h-64 text-muted-foreground"
          >
            <Activity size={36} className="mb-3 opacity-25" />
            <p className="text-sm font-medium">No proposals match your filters.</p>
            {hasFilters && (
              <button
                onClick={() => { setStatusFilter("all"); setProjectFilter("all"); setSearch(""); }}
                className="mt-3 text-xs text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div
          className="space-y-3"
          variants={stagger}
          initial="initial"
          animate="animate"
        >
          {filteredProposals?.map(proposal => {
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
                  <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">

                    {/* Left: title + meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <StatusDot status={proposal.status} />
                        <button
                          className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors"
                          onClick={e => { e.stopPropagation(); navigate(`/projects/${proposal.projectId}`); }}
                        >
                          {proposal.projectName}
                        </button>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2 py-0 h-5 ${getStatusColor(proposal.status)}`}
                        >
                          {proposal.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="font-semibold text-sm md:text-base leading-snug text-foreground group-hover:text-amber-300 transition-colors line-clamp-2 mb-2">
                        {proposal.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground font-mono">
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          Ends {new Date(proposal.endDate).toLocaleDateString()}
                        </span>
                        <span>Quorum: {proposal.quorumThreshold}%</span>
                      </div>
                    </div>

                    {/* Right: vote bar */}
                    <div className="w-full md:w-52 shrink-0 space-y-2">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-green-400">For {forPercent.toFixed(1)}%</span>
                        <span className="text-red-400">Against {againstPercent.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full overflow-hidden flex" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div className="h-full vote-bar-for transition-all" style={{ width: `${forPercent}%` }} />
                        <div className="h-full vote-bar-against transition-all" style={{ width: `${againstPercent}%` }} />
                        <div className="h-full vote-bar-abstain transition-all" style={{ width: `${abstainPercent}%` }} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground font-mono">{totalVotes} total votes</span>
                        <ChevronRight size={14} className="text-muted-foreground/30 group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
