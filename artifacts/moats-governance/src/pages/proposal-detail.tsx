import { useState } from "react";
import { useRoute } from "wouter";
import { useGetProposal, useListVotes, useCastVote, useGetVotingPower, getGetProposalQueryKey, getListVotesQueryKey, getGetVotingPowerQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "wouter";
import { Clock, Shield, Check, X, MinusCircle, AlertCircle, Coins } from "lucide-react";
import { getStatusColor } from "./dashboard";
import { useAccount, useSignMessage } from "wagmi";
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

  const { data: votingPower, isLoading: isLoadingVotingPower } = useGetVotingPower(
    proposalId,
    address ?? "",
    { query: { enabled: !!proposalId && !!address, queryKey: getGetVotingPowerQueryKey(proposalId, address ?? "") } }
  );

  const castVote = useCastVote();
  const { signMessageAsync } = useSignMessage();

  // Per-option percentage inputs (keyed by option index) for weighted voting.
  const [allocInputs, setAllocInputs] = useState<Record<number, string>>({});

  if (isLoadingProposal) {
    return <div className="space-y-8"><Skeleton className="h-32 w-full" /><Skeleton className="h-96 w-full" /></div>;
  }

  if (!proposal) {
    return <div className="text-center py-20 text-muted-foreground">Proposal not found.</div>;
  }

  const customOptions = proposal.options ?? [];
  const isCustomMethod = customOptions.length > 0;

  const totalVotes = (proposal.votesFor || 0) + (proposal.votesAgainst || 0) + (proposal.votesAbstain || 0);
  const forPercent = totalVotes > 0 ? ((proposal.votesFor || 0) / totalVotes) * 100 : 0;
  const againstPercent = totalVotes > 0 ? ((proposal.votesAgainst || 0) / totalVotes) * 100 : 0;
  const abstainPercent = totalVotes > 0 ? ((proposal.votesAbstain || 0) / totalVotes) * 100 : 0;

  // For custom (weighted) methods, results aggregate each voter's per-option
  // percentage allocation. Legacy single-choice custom votes (no allocations)
  // count as 100% to their chosen option.
  const customTotal = votes?.length ?? 0;
  const optionScores = customOptions.map((opt) => {
    let score = 0;
    votes?.forEach((v) => {
      const alloc = v.allocations as Record<string, number> | null | undefined;
      if (alloc && Object.keys(alloc).length > 0) {
        score += alloc[opt] ?? 0;
      } else if (v.choice === opt) {
        score += 100;
      }
    });
    return { option: opt, score };
  });
  const totalScore = optionScores.reduce((s, t) => s + t.score, 0);
  const optionTallies = optionScores.map((t) => ({
    option: t.option,
    percent: totalScore > 0 ? (t.score / totalScore) * 100 : 0,
  }));

  // Live total of the weighted-vote percentage inputs.
  const allocSum = customOptions.reduce(
    (sum, _, idx) => sum + (parseInt(allocInputs[idx] || "0", 10) || 0),
    0
  );

  const quorumLabels: Record<string, string> = {
    simple_majority: "Simple Majority (>51%)",
    supermajority: "Supermajority (>67%)",
    token_weighted: "Token Weighted",
    unanimous: "Unanimous"
  };

  const handleVote = async (choice: string) => {
    if (!address) {
      toast({ title: "Wallet not connected", description: "Please connect your wallet to vote", variant: "destructive" });
      return;
    }

    const message = `Moats App Governance\n\nConfirm vote "${choice.toUpperCase()}" on proposal #${proposalId} (${proposal.title}).\n\nWallet: ${address}\nTimestamp: ${new Date().toISOString()}`;

    let signature: string;
    try {
      signature = await signMessageAsync({ message });
    } catch {
      toast({ title: "Signature required", description: "You must sign the message to confirm your vote.", variant: "destructive" });
      return;
    }

    castVote.mutate({
      id: proposalId,
      data: { walletAddress: address, choice, signature, message }
    }, {
      onSuccess: () => {
        toast({ title: "Vote cast successfully", description: "Your vote has been recorded." });
        queryClient.invalidateQueries({ queryKey: getGetProposalQueryKey(proposalId) });
        queryClient.invalidateQueries({ queryKey: getListVotesQueryKey(proposalId) });
      },
      onError: (err: any) => {
        toast({ title: "Failed to cast vote", description: err.message || "An error occurred", variant: "destructive" });
      }
    });
  };

  const handleWeightedVote = async () => {
    if (!address) {
      toast({ title: "Wallet not connected", description: "Please connect your wallet to vote", variant: "destructive" });
      return;
    }

    // Build the option -> percentage map, keeping only options with a share.
    const cleaned: Record<string, number> = {};
    customOptions.forEach((opt, idx) => {
      const pct = parseInt(allocInputs[idx] || "0", 10) || 0;
      if (pct > 0) cleaned[opt] = pct;
    });
    const total = Object.values(cleaned).reduce((a, b) => a + b, 0);
    if (total !== 100) {
      toast({ title: "Allocations must total 100%", description: `Your percentages currently add up to ${total}%.`, variant: "destructive" });
      return;
    }

    const lines = customOptions
      .filter((opt) => cleaned[opt] > 0)
      .map((opt) => `${opt}: ${cleaned[opt]}%`)
      .join("\n");
    const message = `Moats App Governance\n\nConfirm weighted vote on proposal #${proposalId} (${proposal.title}).\n\n${lines}\n\nWallet: ${address}\nTimestamp: ${new Date().toISOString()}`;

    let signature: string;
    try {
      signature = await signMessageAsync({ message });
    } catch {
      toast({ title: "Signature required", description: "You must sign the message to confirm your vote.", variant: "destructive" });
      return;
    }

    castVote.mutate({
      id: proposalId,
      data: { walletAddress: address, allocations: cleaned, signature, message }
    }, {
      onSuccess: () => {
        toast({ title: "Vote cast successfully", description: "Your weighted vote has been recorded." });
        setAllocInputs({});
        queryClient.invalidateQueries({ queryKey: getGetProposalQueryKey(proposalId) });
        queryClient.invalidateQueries({ queryKey: getListVotesQueryKey(proposalId) });
      },
      onError: (err: any) => {
        toast({ title: "Failed to cast vote", description: err.message || "An error occurred", variant: "destructive" });
      }
    });
  };

  const hasVoted = votes?.some(v => v.walletAddress.toLowerCase() === address?.toLowerCase());
  const now = Date.now();
  const isVotingOpen =
    proposal.status !== "cancelled" &&
    now >= new Date(proposal.startDate).getTime() &&
    now <= new Date(proposal.endDate).getTime();
  const votingNotStarted = now < new Date(proposal.startDate).getTime();

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
                          {vote.allocations && Object.keys(vote.allocations).length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(vote.allocations as Record<string, number>).map(([opt, pct]) => (
                                <Badge key={opt} className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 font-normal">{opt}: {pct}%</Badge>
                              ))}
                            </div>
                          ) : vote.choice === 'for' ? (
                            <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20"><Check size={12} className="mr-1"/> For</Badge>
                          ) : vote.choice === 'against' ? (
                            <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20"><X size={12} className="mr-1"/> Against</Badge>
                          ) : vote.choice === 'abstain' ? (
                            <Badge className="bg-slate-500/10 text-slate-400 hover:bg-slate-500/20 border-slate-500/20"><MinusCircle size={12} className="mr-1"/> Abstain</Badge>
                          ) : vote.choice ? (
                            <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">{vote.choice}</Badge>
                          ) : null}
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
              {isConnected && (
                <div className="flex items-center justify-between p-3 mb-1 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Coins size={16} className="text-primary" />
                    <span>Your Moat Points</span>
                  </div>
                  {isLoadingVotingPower ? (
                    <Skeleton className="h-5 w-16" />
                  ) : (
                    <span className="font-mono font-bold text-primary">
                      {votingPower?.moatPoints != null ? votingPower.moatPoints.toLocaleString() : "0"}
                    </span>
                  )}
                </div>
              )}
              {!isConnected ? (
                <div className="text-center p-4 bg-muted/50 rounded-lg border border-border">
                  <AlertCircle className="mx-auto mb-2 text-muted-foreground" size={24} />
                  <p className="text-sm text-muted-foreground mb-4">Connect your wallet to vote on this proposal.</p>
                  <button
                    onClick={() => { import("@/lib/wallet").then(m => m.appKit.open()); }}
                    className="px-4 py-2 rounded-full text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Connect Wallet
                  </button>
                </div>
              ) : !isVotingOpen ? (
                <div className="text-center p-4 bg-muted/50 rounded-lg border border-border">
                  <p className="text-sm text-muted-foreground">
                    {votingNotStarted ? "Voting has not started yet for this proposal." : "Voting is closed for this proposal."}
                  </p>
                </div>
              ) : hasVoted ? (
                <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                  <Check className="mx-auto mb-2 text-green-500" size={24} />
                  <p className="text-sm text-green-500 font-medium">You have already voted</p>
                </div>
              ) : isCustomMethod ? (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Enter the percentage of your vote to allocate to each option. Your allocations must add up to 100%.
                  </p>
                  <div className="space-y-3">
                    {customOptions.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <span className="flex items-start gap-1.5 min-w-0 flex-1 text-sm">
                          <span className="font-mono text-xs text-primary/70 shrink-0 mt-0.5">{idx + 1}.</span>
                          <span className="break-words">{opt}</span>
                        </span>
                        <div className="relative shrink-0 w-24">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            inputMode="numeric"
                            placeholder="0"
                            value={allocInputs[idx] ?? ""}
                            onChange={(e) => setAllocInputs((prev) => ({ ...prev, [idx]: e.target.value }))}
                            disabled={castVote.isPending}
                            className="pr-7 text-right font-mono"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className={`flex justify-between items-center text-sm font-mono px-1 ${allocSum === 100 ? "text-green-500" : "text-muted-foreground"}`}>
                    <span>Total allocated</span>
                    <span className="font-bold">{allocSum}% / 100%</span>
                  </div>
                  <Button
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all font-bold"
                    size="lg"
                    onClick={handleWeightedVote}
                    disabled={castVote.isPending || allocSum !== 100}
                  >
                    {castVote.isPending ? "Submitting…" : "Submit Votes"}
                  </Button>
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
              {isCustomMethod ? (
                <>
                  {optionTallies.map((t, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between mb-2 text-sm font-medium gap-3">
                        <span className="text-foreground flex items-start gap-1.5 min-w-0">
                          <span className="font-mono text-xs text-primary/70 shrink-0">{idx + 1}.</span>
                          <span className="break-words">{t.option}</span>
                        </span>
                        <span className="font-mono shrink-0">{t.percent.toFixed(1)}%</span>
                      </div>
                      <Progress value={t.percent} className="h-2 bg-muted [&>div]:bg-primary" />
                    </div>
                  ))}
                  <div className="pt-4 border-t border-border flex justify-between items-center text-sm font-mono text-muted-foreground">
                    <span>Total Votes</span>
                    <span className="font-bold text-foreground">{customTotal}</span>
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
