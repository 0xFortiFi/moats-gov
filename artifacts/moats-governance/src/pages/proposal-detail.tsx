import { useState } from "react";
import { useRoute } from "wouter";
import { useGetProposal, useListVotes, useCastVote, useGetVotingPower, getGetProposalQueryKey, getListVotesQueryKey, getGetVotingPowerQueryKey } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "wouter";
import { Clock, Shield, Check, X, MinusCircle, AlertCircle, Coins, ChevronLeft } from "lucide-react";
import { getStatusColor } from "./dashboard";
import { useAccount, useSignMessage } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22,1,0.36,1] as [number,number,number,number] } },
};

function VoteBar({ label, color, value, count }: { label: string; color: string; value: number; count: number }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium" style={{ color }}>{label}</span>
        <span className="font-mono text-xs text-muted-foreground">
          {count} ({value.toFixed(1)}%)
        </span>
      </div>
      <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color, boxShadow: `0 0 8px ${color}50` }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: [0.22,1,0.36,1] as [number,number,number,number], delay: 0.1 }}
        />
      </div>
    </div>
  );
}

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

  const [allocInputs, setAllocInputs] = useState<Record<number, string>>({});

  if (isLoadingProposal) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
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

  const customTotal = votes?.length ?? 0;
  const optionScores = customOptions.map(opt => {
    let score = 0;
    votes?.forEach(v => {
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
  const optionTallies = optionScores.map(t => ({
    option: t.option,
    percent: totalScore > 0 ? (t.score / totalScore) * 100 : 0,
  }));

  const allocSum = customOptions.reduce(
    (sum, _, idx) => sum + (parseInt(allocInputs[idx] || "0", 10) || 0),
    0
  );

  const quorumLabels: Record<string, string> = {
    simple_majority: "Simple Majority (>51%)",
    supermajority:   "Supermajority (>67%)",
    token_weighted:  "Token Weighted",
    unanimous:       "Unanimous"
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
    castVote.mutate({ id: proposalId, data: { walletAddress: address, choice, signature, message } }, {
      onSuccess: () => {
        toast({ title: "Vote cast successfully", description: "Your vote has been recorded." });
        queryClient.invalidateQueries({ queryKey: getGetProposalQueryKey(proposalId) });
        queryClient.invalidateQueries({ queryKey: getListVotesQueryKey(proposalId) });
      },
      onError: (err: any) => toast({ title: "Failed to cast vote", description: err.message || "An error occurred", variant: "destructive" }),
    });
  };

  const handleWeightedVote = async () => {
    if (!address) {
      toast({ title: "Wallet not connected", description: "Please connect your wallet to vote", variant: "destructive" });
      return;
    }
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
    const lines = customOptions.filter(opt => cleaned[opt] > 0).map(opt => `${opt}: ${cleaned[opt]}%`).join("\n");
    const message = `Moats App Governance\n\nConfirm weighted vote on proposal #${proposalId} (${proposal.title}).\n\n${lines}\n\nWallet: ${address}\nTimestamp: ${new Date().toISOString()}`;
    let signature: string;
    try {
      signature = await signMessageAsync({ message });
    } catch {
      toast({ title: "Signature required", description: "You must sign the message to confirm your vote.", variant: "destructive" });
      return;
    }
    castVote.mutate({ id: proposalId, data: { walletAddress: address, allocations: cleaned, signature, message } }, {
      onSuccess: () => {
        toast({ title: "Vote cast successfully", description: "Your weighted vote has been recorded." });
        setAllocInputs({});
        queryClient.invalidateQueries({ queryKey: getGetProposalQueryKey(proposalId) });
        queryClient.invalidateQueries({ queryKey: getListVotesQueryKey(proposalId) });
      },
      onError: (err: any) => toast({ title: "Failed to cast vote", description: err.message || "An error occurred", variant: "destructive" }),
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
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* ── Breadcrumb ───────────────────────────────────────────────────── */}
      <motion.div variants={fadeUp} initial="initial" animate="animate">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <Link href="/proposals" className="flex items-center gap-1 hover:text-primary transition-colors">
            <ChevronLeft size={13} /> Proposals
          </Link>
          <span>/</span>
          <Link href={`/projects/${proposal.projectId}`} className="flex items-center gap-1 hover:text-primary transition-colors">
            <Shield size={12} className="text-primary/60" />
            {proposal.projectName}
          </Link>
          <span>/</span>
          <span className="text-muted-foreground/60">#{proposal.id}</span>
        </div>
      </motion.div>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
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
            style={{ background: "radial-gradient(ellipse 80% 60% at 0% 0%, rgba(212,147,26,0.06), transparent 60%)" }}
          />
          <div className="relative">
            <div className="flex items-start justify-between gap-4 mb-5">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight flex-1">
                {proposal.title}
              </h1>
              <Badge
                variant="outline"
                className={`text-xs px-3 py-1 shrink-0 font-semibold ${getStatusColor(proposal.status)}`}
              >
                {proposal.status.toUpperCase()}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2.5 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock size={13} className="text-primary/60" />
                <span>Ends <span className="text-foreground">{new Date(proposal.endDate).toLocaleString()}</span></span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Shield size={13} className="text-primary/60" />
                <span>Quorum: <span className="text-foreground">{quorumLabels[proposal.quorumType] ?? proposal.quorumType} ({proposal.quorumThreshold}%)</span></span>
              </div>
              <div className="text-muted-foreground">
                By: <span className="text-foreground">{proposal.createdBy.slice(0, 6)}…{proposal.createdBy.slice(-4)}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Main content grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">

          {/* Description */}
          <motion.div variants={fadeUp} initial="initial" animate="animate">
            <div
              className="rounded-xl p-5 md:p-6"
              style={{ background: "rgba(11,26,50,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <h2 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wider">Description</h2>
              <div className="prose prose-invert max-w-none text-foreground/80 leading-relaxed whitespace-pre-wrap text-sm">
                {proposal.description || "No description provided."}
              </div>
            </div>
          </motion.div>

          {/* Vote history */}
          <motion.div variants={fadeUp} initial="initial" animate="animate">
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: "rgba(11,26,50,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="px-5 md:px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  Vote History
                  {votes && votes.length > 0 && (
                    <span className="ml-2 text-xs font-normal normal-case text-muted-foreground/60">
                      ({votes.length})
                    </span>
                  )}
                </h2>
              </div>
              <div className="p-5 md:p-6">
                {isLoadingVotes ? (
                  <div className="space-y-2">
                    {[1,2,3].map(i => <Skeleton key={i} className="h-11 w-full rounded-lg" />)}
                  </div>
                ) : votes?.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm">
                    No votes cast yet.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                        <TableHead className="text-xs">Voter</TableHead>
                        <TableHead className="text-xs">Choice</TableHead>
                        <TableHead className="text-right text-xs">Moat Points</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {votes?.map(vote => (
                        <TableRow key={vote.id} style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {vote.walletAddress.slice(0, 6)}…{vote.walletAddress.slice(-4)}
                          </TableCell>
                          <TableCell>
                            {vote.allocations && Object.keys(vote.allocations).length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(vote.allocations as Record<string, number>).map(([opt, pct]) => (
                                  <Badge key={opt} className="bg-primary/10 text-primary border-primary/20 text-[10px] font-normal">
                                    {opt}: {pct}%
                                  </Badge>
                                ))}
                              </div>
                            ) : vote.choice === "for" ? (
                              <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px]"><Check size={10} className="mr-1"/> For</Badge>
                            ) : vote.choice === "against" ? (
                              <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px]"><X size={10} className="mr-1"/> Against</Badge>
                            ) : vote.choice === "abstain" ? (
                              <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20 text-[10px]"><MinusCircle size={10} className="mr-1"/> Abstain</Badge>
                            ) : vote.choice ? (
                              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">{vote.choice}</Badge>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold" style={{ color: "#D4931A" }}>
                            {vote.moatPoints?.toLocaleString() || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right column */}
        <div className="space-y-5">

          {/* Cast vote */}
          <motion.div variants={fadeUp} initial="initial" animate="animate">
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: "rgba(11,26,50,0.85)",
                border: "1px solid rgba(212,147,26,0.18)",
                boxShadow: "0 0 24px rgba(212,147,26,0.06)",
              }}
            >
              <div
                className="px-5 py-4"
                style={{
                  background: "linear-gradient(135deg, rgba(212,147,26,0.1), rgba(212,147,26,0.03))",
                  borderBottom: "1px solid rgba(212,147,26,0.12)",
                }}
              >
                <h2 className="font-semibold text-sm">Cast Your Vote</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Voting power determined by Moat Points balance.</p>
              </div>
              <div className="p-5 space-y-4">

                {isConnected && (
                  <div
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: "rgba(212,147,26,0.06)", border: "1px solid rgba(212,147,26,0.12)" }}
                  >
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Coins size={14} className="text-amber-400" />
                      <span>Your Moat Points</span>
                    </div>
                    {isLoadingVotingPower ? (
                      <Skeleton className="h-4 w-16" />
                    ) : (
                      <span className="font-mono font-bold text-sm" style={{ color: "#D4931A" }}>
                        {votingPower?.moatPoints != null ? votingPower.moatPoints.toLocaleString() : "0"}
                      </span>
                    )}
                  </div>
                )}

                {!isConnected ? (
                  <div
                    className="text-center p-5 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    <AlertCircle className="mx-auto mb-2 text-muted-foreground/50" size={22} />
                    <p className="text-sm text-muted-foreground mb-4">Connect your wallet to vote on this proposal.</p>
                    <button
                      onClick={() => { import("@/lib/wallet").then(m => m.appKit.open()); }}
                      className="px-5 py-2 rounded-full text-sm font-semibold transition-all"
                      style={{
                        background: "linear-gradient(135deg, #D4931A, #B8771A)",
                        color: "#050d18",
                        boxShadow: "0 2px 12px rgba(212,147,26,0.3)",
                      }}
                    >
                      Connect Wallet
                    </button>
                  </div>
                ) : !isVotingOpen ? (
                  <div
                    className="text-center p-4 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    <p className="text-sm text-muted-foreground">
                      {votingNotStarted ? "Voting has not started yet for this proposal." : "Voting is closed for this proposal."}
                    </p>
                  </div>
                ) : hasVoted ? (
                  <div
                    className="text-center p-4 rounded-lg"
                    style={{ background: "rgba(74,222,128,0.07)", border: "1px solid rgba(74,222,128,0.18)" }}
                  >
                    <Check className="mx-auto mb-2 text-green-400" size={22} />
                    <p className="text-sm text-green-400 font-medium">You have already voted</p>
                  </div>
                ) : isCustomMethod ? (
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                      Allocate your vote across options. Must total 100%.
                    </p>
                    <div className="space-y-3">
                      {customOptions.map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <span className="flex-1 text-sm break-words min-w-0">
                            <span className="font-mono text-[10px] text-primary/60 mr-1">{idx + 1}.</span>
                            {opt}
                          </span>
                          <div className="relative shrink-0 w-20">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              inputMode="numeric"
                              placeholder="0"
                              value={allocInputs[idx] ?? ""}
                              onChange={e => setAllocInputs(prev => ({ ...prev, [idx]: e.target.value }))}
                              disabled={castVote.isPending}
                              className="pr-6 text-right font-mono text-sm h-9"
                              style={{ background: "rgba(255,255,255,0.04)" }}
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none">%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div
                      className={`flex justify-between items-center text-xs font-mono px-1 ${allocSum === 100 ? "text-green-400" : "text-muted-foreground"}`}
                    >
                      <span>Total allocated</span>
                      <span className="font-bold">{allocSum}% / 100%</span>
                    </div>
                    <Button
                      className="w-full font-semibold"
                      style={{
                        background: allocSum === 100 ? "linear-gradient(135deg, #D4931A, #B8771A)" : undefined,
                        color: allocSum === 100 ? "#050d18" : undefined,
                        boxShadow: allocSum === 100 ? "0 2px 16px rgba(212,147,26,0.3)" : undefined,
                      }}
                      onClick={handleWeightedVote}
                      disabled={castVote.isPending || allocSum !== 100}
                    >
                      {castVote.isPending ? "Submitting…" : "Submit Votes"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <button
                      className="w-full py-3 rounded-lg text-sm font-semibold transition-all border"
                      style={{
                        background: "rgba(74,222,128,0.08)",
                        color: "#4ade80",
                        borderColor: "rgba(74,222,128,0.25)",
                      }}
                      onClick={() => handleVote("for")}
                      disabled={castVote.isPending}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = "rgba(74,222,128,0.18)";
                        (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 16px rgba(74,222,128,0.15)";
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = "rgba(74,222,128,0.08)";
                        (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                      }}
                    >
                      ✓ Vote FOR
                    </button>
                    <button
                      className="w-full py-3 rounded-lg text-sm font-semibold transition-all border"
                      style={{
                        background: "rgba(248,113,113,0.08)",
                        color: "#f87171",
                        borderColor: "rgba(248,113,113,0.25)",
                      }}
                      onClick={() => handleVote("against")}
                      disabled={castVote.isPending}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = "rgba(248,113,113,0.18)";
                        (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 16px rgba(248,113,113,0.15)";
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = "rgba(248,113,113,0.08)";
                        (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                      }}
                    >
                      ✗ Vote AGAINST
                    </button>
                    <button
                      className="w-full py-3 rounded-lg text-sm font-medium transition-all border"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        color: "rgba(148,163,184,0.75)",
                        borderColor: "rgba(255,255,255,0.08)",
                      }}
                      onClick={() => handleVote("abstain")}
                      disabled={castVote.isPending}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)";
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                      }}
                    >
                      — ABSTAIN
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Current results */}
          <motion.div variants={fadeUp} initial="initial" animate="animate">
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: "rgba(11,26,50,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div
                className="px-5 py-4"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <h2 className="font-semibold text-sm">Current Results</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {totalVotes} total vote{totalVotes !== 1 ? "s" : ""} cast
                </p>
              </div>
              <div className="p-5 space-y-5">
                {isCustomMethod ? (
                  <>
                    {optionTallies.map((t, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex justify-between items-start gap-2 text-sm">
                          <span className="text-foreground/90 text-xs leading-snug min-w-0 break-words">
                            <span className="font-mono text-[10px] text-primary/60 mr-1">{idx + 1}.</span>
                            {t.option}
                          </span>
                          <span className="font-mono text-xs shrink-0 font-semibold" style={{ color: "#D4931A" }}>
                            {t.percent.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: "linear-gradient(90deg, #D4931A, #F0B429)" }}
                            initial={{ width: 0 }}
                            animate={{ width: `${t.percent}%` }}
                            transition={{ duration: 0.8, ease: [0.22,1,0.36,1] as [number,number,number,number], delay: idx * 0.05 }}
                          />
                        </div>
                      </div>
                    ))}
                    <div
                      className="pt-3 flex justify-between items-center text-xs font-mono text-muted-foreground"
                      style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <span>Total Votes</span>
                      <span className="font-bold text-foreground">{customTotal}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <VoteBar label="For" color="#4ade80" value={forPercent} count={proposal.votesFor || 0} />
                    <VoteBar label="Against" color="#f87171" value={againstPercent} count={proposal.votesAgainst || 0} />
                    <VoteBar label="Abstain" color="#64748b" value={abstainPercent} count={proposal.votesAbstain || 0} />
                    <div
                      className="pt-3 flex justify-between items-center text-xs font-mono text-muted-foreground"
                      style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <span>Total Votes</span>
                      <span className="font-bold text-foreground">{totalVotes}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
