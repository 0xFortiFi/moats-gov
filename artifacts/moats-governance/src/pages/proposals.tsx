import { useState } from "react";
import { useListProposals, useListProjects, ListProposalsStatus } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { Clock, Activity, Search, FilterX } from "lucide-react";
import { getStatusColor } from "./dashboard";
import React from "react";

export default function Proposals() {
  const [statusFilter, setStatusFilter] = React.useState<ListProposalsStatus | "all">("all");
  const [projectFilter, setProjectFilter] = React.useState<string>("all");
  const [search, setSearch] = React.useState("");

  const { data: projects, isLoading: isLoadingProjects } = useListProjects();
  
  const queryParams: any = {};
  if (statusFilter !== "all") queryParams.status = statusFilter;
  if (projectFilter !== "all") queryParams.projectId = parseInt(projectFilter, 10);

  const { data: proposals, isLoading: isLoadingProposals } = useListProposals(queryParams);

  const filteredProposals = proposals?.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase()) || 
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in zoom-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Proposals</h1>
          <p className="text-muted-foreground">Browse and vote on active governance proposals.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search proposals..." 
              className="pl-9 bg-card border-card-border"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter as string} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-full sm:w-[140px] bg-card border-card-border">
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
            <SelectTrigger className="w-full sm:w-[180px] bg-card border-card-border">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects?.map(p => (
                <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(statusFilter !== "all" || projectFilter !== "all" || search) && (
            <button 
              onClick={() => { setStatusFilter("all"); setProjectFilter("all"); setSearch(""); }}
              className="text-muted-foreground hover:text-foreground transition-colors p-2"
              title="Clear filters"
            >
              <FilterX size={18} />
            </button>
          )}
        </div>
      </div>

      {isLoadingProposals ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : filteredProposals?.length === 0 ? (
        <Card className="border-dashed bg-transparent">
          <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Activity size={48} className="mb-4 opacity-50" />
            <p>No proposals match your filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredProposals?.map(proposal => {
            const totalVotes = (proposal.votesFor || 0) + (proposal.votesAgainst || 0) + (proposal.votesAbstain || 0);
            const forPercent = totalVotes > 0 ? ((proposal.votesFor || 0) / totalVotes) * 100 : 0;
            const againstPercent = totalVotes > 0 ? ((proposal.votesAgainst || 0) / totalVotes) * 100 : 0;
            const abstainPercent = totalVotes > 0 ? ((proposal.votesAbstain || 0) / totalVotes) * 100 : 0;

            return (
              <Card key={proposal.id} className="transition-colors hover:border-primary/50 group bg-card">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Link href={`/projects/${proposal.projectId}`} className="text-xs font-mono text-muted-foreground hover:text-primary">
                          {proposal.projectName}
                        </Link>
                        <Badge variant="outline" className={getStatusColor(proposal.status)}>
                          {proposal.status.toUpperCase()}
                        </Badge>
                      </div>
                      <Link href={`/proposals/${proposal.id}`} className="text-lg font-bold group-hover:text-primary transition-colors block mb-2">
                        {proposal.title}
                      </Link>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground font-mono">
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          <span>Ends {new Date(proposal.endDate).toLocaleDateString()}</span>
                        </div>
                        <div>Quorum: {proposal.quorumThreshold}%</div>
                      </div>
                    </div>
                    
                    <div className="w-full md:w-64 space-y-2">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-green-500">For {forPercent.toFixed(1)}%</span>
                        <span className="text-red-500">Against {againstPercent.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
                        <div className="h-full bg-green-500" style={{ width: `${forPercent}%` }} />
                        <div className="h-full bg-red-500" style={{ width: `${againstPercent}%` }} />
                        <div className="h-full bg-slate-500" style={{ width: `${abstainPercent}%` }} />
                      </div>
                      <div className="text-right text-xs text-muted-foreground font-mono">
                        {totalVotes} total votes
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
