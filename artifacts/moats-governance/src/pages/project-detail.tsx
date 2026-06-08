import { useRoute } from "wouter";
import { useGetProject, useGetProjectLeaderboard, useListProposals, getGetProjectQueryKey, getGetProjectLeaderboardQueryKey, getListProposalsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "wouter";
import { Activity, Clock, Trophy, ExternalLink, Shield } from "lucide-react";
import { getStatusColor } from "./dashboard";

export default function ProjectDetail() {
  const [, params] = useRoute("/projects/:id");
  const projectId = params?.id ? parseInt(params.id, 10) : 0;

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
    return <div className="space-y-8"><Skeleton className="h-32 w-full" /><Skeleton className="h-96 w-full" /></div>;
  }

  if (!project) {
    return <div className="text-center py-20 text-muted-foreground">Project not found.</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in zoom-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-6">
          {project.logoUrl ? (
            <img src={project.logoUrl} alt={project.name} className="w-20 h-20 rounded-xl border border-primary/20 bg-card object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-xl border border-primary/20 bg-muted flex items-center justify-center text-3xl font-bold text-muted-foreground">
              {project.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">{project.name}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground font-mono">
              <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded">
                <Shield size={14} className="text-primary" />
                {project.contractAddress}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="bg-card border border-border px-4 py-2 rounded-lg text-center">
            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Total</div>
            <div className="font-mono text-xl font-bold">{project.totalProposals || 0}</div>
          </div>
          <div className="bg-card border border-primary/30 px-4 py-2 rounded-lg text-center">
            <div className="text-xs text-primary mb-1 uppercase tracking-wider">Active</div>
            <div className="font-mono text-xl font-bold text-primary">{project.activeProposals || 0}</div>
          </div>
        </div>
      </div>

      {project.description && (
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="p-6">
            <p className="text-muted-foreground leading-relaxed">{project.description}</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="proposals" className="w-full">
        <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none h-12 p-0 space-x-6">
          <TabsTrigger value="proposals" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-full">
            Proposals
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-full">
            Moat Points Leaderboard
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="proposals" className="pt-6">
          {isLoadingProposals ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
            </div>
          ) : proposals?.length === 0 ? (
            <Card className="border-dashed bg-transparent">
              <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <Activity size={32} className="mb-4 opacity-50" />
                <p>No proposals found for this project.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {proposals?.map(proposal => (
                <Card key={proposal.id} className="transition-colors hover:border-primary/50 group">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
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
                      <div>Quorum: {proposal.quorumThreshold}%</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="leaderboard" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="text-primary" />
                Top Delegates
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingLeaderboard ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : leaderboard?.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  No Moat Points distributed yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="w-16">Rank</TableHead>
                      <TableHead>Wallet</TableHead>
                      <TableHead className="text-right">Moat Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboard?.map((entry) => (
                      <TableRow key={entry.walletAddress} className="border-border/50">
                        <TableCell className="font-mono text-muted-foreground">{entry.rank}</TableCell>
                        <TableCell className="font-mono">{entry.walletAddress}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-primary">
                          {entry.points.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
