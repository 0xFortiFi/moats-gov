import { useGetProposalsSummary, useListProposals } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { FileText, CheckCircle2, XCircle, Clock, Activity } from "lucide-react";

export function getStatusColor(status: string) {
  switch (status) {
    case "active":
      return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    case "passed":
      return "bg-green-500/10 text-green-500 border-green-500/20";
    case "failed":
      return "bg-red-500/10 text-red-500 border-red-500/20";
    case "pending":
      return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    case "cancelled":
      return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    default:
      return "bg-primary/10 text-primary border-primary/20";
  }
}

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetProposalsSummary();
  const { data: activeProposals, isLoading: isLoadingProposals } = useListProposals({ status: "active" });

  return (
    <div className="space-y-8 animate-in fade-in zoom-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Command Center</h1>
        <p className="text-muted-foreground">Platform-wide governance overview and active operations.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-card-border overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <FileText size={48} />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Proposals</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-8 w-20" /> : <div className="text-3xl font-bold">{summary?.total || 0}</div>}
          </CardContent>
        </Card>
        <Card className="bg-card border-card-border overflow-hidden relative border-l-4 border-l-primary">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-primary">
            <Activity size={48} />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Operations</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-8 w-20" /> : <div className="text-3xl font-bold text-primary">{summary?.active || 0}</div>}
          </CardContent>
        </Card>
        <Card className="bg-card border-card-border overflow-hidden relative border-l-4 border-l-green-500/50">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-green-500">
            <CheckCircle2 size={48} />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Passed</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-8 w-20" /> : <div className="text-3xl font-bold">{summary?.passed || 0}</div>}
          </CardContent>
        </Card>
        <Card className="bg-card border-card-border overflow-hidden relative border-l-4 border-l-red-500/50">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-red-500">
            <XCircle size={48} />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-8 w-20" /> : <div className="text-3xl font-bold">{summary?.failed || 0}</div>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">Active Proposals</h2>
            <Link href="/proposals" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          
          {isLoadingProposals ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
            </div>
          ) : activeProposals?.length === 0 ? (
            <Card className="border-dashed bg-transparent">
              <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <Activity size={32} className="mb-4 opacity-50" />
                <p>No active proposals at this time.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeProposals?.map(proposal => (
                <Card key={proposal.id} className="transition-colors hover:border-primary/50 group">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Link href={`/projects/${proposal.projectId}`} className="text-xs font-mono text-muted-foreground hover:text-primary">
                            {proposal.projectName}
                          </Link>
                          <Badge variant="outline" className={getStatusColor(proposal.status)}>
                            {proposal.status.toUpperCase()}
                          </Badge>
                        </div>
                        <Link href={`/proposals/${proposal.id}`} className="text-lg font-bold group-hover:text-primary transition-colors">
                          {proposal.title}
                        </Link>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>Ends {new Date(proposal.endDate).toLocaleDateString()}</span>
                      </div>
                      <div>
                        Quorum: {proposal.quorumThreshold}%
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">System Status</h2>
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium">Mainnet Synced</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium">Arbitrum Synced</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium">Base Synced</span>
              </div>
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Governance actions are secured by cryptographic signatures. Connect your wallet to participate in active proposals.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
