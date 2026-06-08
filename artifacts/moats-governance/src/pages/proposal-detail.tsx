import { useRoute } from "wouter";
import { useGetProposal, useListVotes, useCastVote, getGetProposalQueryKey, getListVotesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "wouter";
import { Clock, Shield, Check, X, MinusCircle, AlertCircle } from "lucide-react";
import { getStatusColor } from "./dashboard";
import { useAccount } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function ProposalDetail() {
  const [, params] = useRoute("/proposals/:id");
  const proposalId = params?.id ? parseInt(params.id, 10) : 0;
  const { isConnected, address } = useAccount();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: proposal, isLoading: isLoadingProposal } = useGetProposal(proposalId, {
    query: { enabled: !!proposalId, queryKey: getGetProposalQueryKey(proposalId) }
  });

  const { data: votes, isLoading: isLoadingVotes } = useListVotes(proposalId, {
    query: { enabled: !!proposalId, queryKey: getListVotesQueryKey(proposalId) }
  });

  const castVote = useCastVote();

  if (isLoadingProposal) {
    return <div className="space-y-8"><Skeleton className="h-32 w-full" /><Skeleton className="h-96 w-full" /></div>;
  }

  if (!proposal) {
    return <div className="text-center py-20 text-muted-foreground">Proposal not found.</div>;
  }

  const totalVotes = (proposal.votesFor || 0) + (proposal.votesAgainst || 0) + (proposal.votesAbstain || 0);
  const forPercent = totalVotes > 0 ? ((proposal.votesFor || 0) / totalVotes) * 100 : 0;
  const againstPercent = totalVotes > 0 ? ((proposal.votesAgainst || 0) / totalVotes) * 100 : 0;
  const abstainPercent = totalVotes > 0 ? ((proposal.votesAbstain || 0) / totalVotes) * 100 : 0;

  const quorumLabels: Record<string, string> = {
    simple_majority: "Simple Majority (>51%)",
    supermajority: "Supermajority (>67%)",
    token_weighted: "Token Weighted",
    unanimous: "Unanimous"
  };

  const handleVote = (choice: "for" | "against" | "abstain") => {
    if (!address) {
      toast({ title: "Wallet not connected", description: "Please connect your wallet to vote", variant: "destructive" });
      return;
    }
    
    castVote.mutate({
      id: proposalId,
      data: { walletAddress: address, choice }
    }, {
      onSuccess: () => {
        toast({ title: "Vote cast successfully", description: "Your vote has been recorded on-chain." });
        queryClient.invalidateQueries({ queryKey: getGetProposalQueryKey(proposalId) });
        queryClient.invalidateQueries({ queryKey: getListVotesQueryKey(proposalId) });
      },
      onError: (err: any) => {
        toast({ title: "Failed to cast vote", description: err.message || "An error occurred", variant: "destructive" });
      }
    });
  };

  const hasVoted = votes?.some(v => v.walletAddress.toLowerCase() === address?.toLowerCase());

  return (
    <div className="space-y-8 animate-in fade-in zoom-in duration-500 max-w-5xl mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Link href={`/projects/${proposal.projectId}`} className="text-sm font-mono text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
            <Shield size={14} />
            {proposal.projectName}
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-mono text-muted-foreground">Proposal #{proposal.id}</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
          <h1 className="text-3xl font-bold tracking-tight leading-tight flex-1">{proposal.title}</h1>
          <Badge variant="outline" className={`text-sm px-3 py-1 ${getStatusColor(proposal.status)}`}>
            {proposal.status.toUpperCase()}
          </Badge>
        </div>
        
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground font-mono bg-card border border-border p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-primary" />
            <span>Ends: <span className="text-foreground">{new Date(proposal.endDate).toLocaleString()}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-primary" />
            <span>Quorum: <span className="text-foreground">{quorumLabels[proposal.quorumType]} ({proposal.quorumThreshold}%)</span></span>
          </div>
          <div>
            Created by: <span className="text-foreground">{proposal.createdBy.slice(0, 6)}...{proposal.createdBy.slice(-4)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {proposal.description || "No description provided."}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Votes</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingVotes ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : votes?.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  No votes cast yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead>Voter</TableHead>
                      <TableHead>Choice</TableHead>
                      <TableHead className="text-right">Moat Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {votes?.map((vote) => (
                      <TableRow key={vote.id} className="border-border/50">
                        <TableCell className="font-mono text-sm">{vote.walletAddress.slice(0, 6)}...{vote.walletAddress.slice(-4)}</TableCell>
                        <TableCell>
                          {vote.choice === 'for' && <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20"><Check size={12} className="mr-1"/> For</Badge>}
                          {vote.choice === 'against' && <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20"><X size={12} className="mr-1"/> Against</Badge>}
                          {vote.choice === 'abstain' && <Badge className="bg-slate-500/10 text-slate-400 hover:bg-slate-500/20 border-slate-500/20"><MinusCircle size={12} className="mr-1"/> Abstain</Badge>}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium text-primary">
                          {vote.moatPoints?.toLocaleString() || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-primary/20 shadow-lg shadow-primary/5">
            <CardHeader>
              <CardTitle>Cast Your Vote</CardTitle>
              <CardDescription>Voting power is determined by your Moat Points balance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isConnected ? (
                <div className="text-center p-4 bg-muted/50 rounded-lg border border-border">
                  <AlertCircle className="mx-auto mb-2 text-muted-foreground" size={24} />
                  <p className="text-sm text-muted-foreground mb-4">Connect your wallet to vote on this proposal.</p>
                  <appkit-button />
                </div>
              ) : proposal.status !== 'active' ? (
                <div className="text-center p-4 bg-muted/50 rounded-lg border border-border">
                  <p className="text-sm text-muted-foreground">Voting is closed for this proposal.</p>
                </div>
              ) : hasVoted ? (
                <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                  <Check className="mx-auto mb-2 text-green-500" size={24} />
                  <p className="text-sm text-green-500 font-medium">You have already voted</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Button 
                    className="w-full bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-black border border-green-500/30 transition-all font-bold" 
                    size="lg"
                    onClick={() => handleVote("for")}
                    disabled={castVote.isPending}
                  >
                    Vote FOR
                  </Button>
                  <Button 
                    className="w-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-black border border-red-500/30 transition-all font-bold" 
                    size="lg"
                    onClick={() => handleVote("against")}
                    disabled={castVote.isPending}
                  >
                    Vote AGAINST
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full hover:bg-muted font-bold text-muted-foreground" 
                    size="lg"
                    onClick={() => handleVote("abstain")}
                    disabled={castVote.isPending}
                  >
                    ABSTAIN
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between mb-2 text-sm font-medium">
                  <span className="text-green-500">For</span>
                  <span className="font-mono">{proposal.votesFor || 0} ({forPercent.toFixed(1)}%)</span>
                </div>
                <Progress value={forPercent} className="h-2 bg-muted [&>div]:bg-green-500" />
              </div>
              
              <div>
                <div className="flex justify-between mb-2 text-sm font-medium">
                  <span className="text-red-500">Against</span>
                  <span className="font-mono">{proposal.votesAgainst || 0} ({againstPercent.toFixed(1)}%)</span>
                </div>
                <Progress value={againstPercent} className="h-2 bg-muted [&>div]:bg-red-500" />
              </div>

              <div>
                <div className="flex justify-between mb-2 text-sm font-medium">
                  <span className="text-slate-400">Abstain</span>
                  <span className="font-mono">{proposal.votesAbstain || 0} ({abstainPercent.toFixed(1)}%)</span>
                </div>
                <Progress value={abstainPercent} className="h-2 bg-muted [&>div]:bg-slate-500" />
              </div>

              <div className="pt-4 border-t border-border flex justify-between items-center text-sm font-mono text-muted-foreground">
                <span>Total Votes</span>
                <span className="font-bold text-foreground">{totalVotes}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
