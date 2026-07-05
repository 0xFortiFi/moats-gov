import React from "react";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import {
  useListProjects,
  useListProposals,
  useListAdmins,
  useCreateProposal,
  useUpdateProposal,
  useDeleteProposal,
  QuorumType,
  VotingMethod,
  Proposal,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, CheckCircle2, Info, Pencil, FileText, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";

type VerifiedMoat = {
  contractAddress: string;
  name: string;
  network: string;
  description: string | null;
  tags: Array<{ name: string; color: string }>;
};

const QUORUM_TYPES: Array<{
  value: QuorumType;
  label: string;
  description: string;
  group: string;
  thresholdLabel: string;
  hasApprovalThreshold: boolean;
  thresholdUnit: "%" | "tokens";
}> = [
  { value: "participation",  label: "Participation",          description: "All votes count toward quorum: FOR + AGAINST + ABSTAIN",                                      group: "Participation-Based", thresholdLabel: "Min. Participation",         hasApprovalThreshold: false, thresholdUnit: "%" },
  { value: "approval",       label: "Approval Only",          description: "Only FOR votes count — a minimum level of active support is required",                        group: "Participation-Based", thresholdLabel: "Min. FOR Votes",             hasApprovalThreshold: false, thresholdUnit: "%" },
  { value: "for_abstain",    label: "For + Abstain",          description: "FOR and ABSTAIN votes count — neutral participation is recognised",                           group: "Participation-Based", thresholdLabel: "Min. FOR + ABSTAIN",         hasApprovalThreshold: false, thresholdUnit: "%" },
  { value: "percentage",     label: "Percentage-Based",       description: "A % of total eligible voting power must participate",                                         group: "Threshold-Based",     thresholdLabel: "Participation %",            hasApprovalThreshold: false, thresholdUnit: "%" },
  { value: "fixed_token",    label: "Fixed Token",            description: "A fixed amount of voting power (tokens) must participate",                                    group: "Threshold-Based",     thresholdLabel: "Min. Voting Power (tokens)", hasApprovalThreshold: false, thresholdUnit: "tokens" },
  { value: "dual",           label: "Dual Quorum",            description: "Requires both a participation minimum AND a minimum approval percentage",                     group: "Threshold-Based",     thresholdLabel: "Participation %",            hasApprovalThreshold: true,  thresholdUnit: "%" },
  { value: "veto",           label: "Veto",                   description: "Proposal passes by default unless opposition reaches the threshold",                          group: "Threshold-Based",     thresholdLabel: "Veto Threshold",             hasApprovalThreshold: false, thresholdUnit: "%" },
  { value: "dynamic",        label: "Dynamic",                description: "Quorum adjusts automatically based on average historical participation × multiplier",         group: "Adaptive",            thresholdLabel: "Multiplier %",               hasApprovalThreshold: false, thresholdUnit: "%" },
  { value: "time_weighted",  label: "Time-Weighted",          description: "Quorum requirement changes over the voting period (starts high, decreases)",                  group: "Adaptive",            thresholdLabel: "Initial Quorum %",           hasApprovalThreshold: false, thresholdUnit: "%" },
  { value: "tiered",         label: "Tiered",                 description: "Different proposal types require different quorum levels (set the base %)",                   group: "Adaptive",            thresholdLabel: "Base Quorum %",              hasApprovalThreshold: false, thresholdUnit: "%" },
  { value: "security",       label: "Security / Constitutional", description: "Elevated requirements for critical or protocol-level changes",                            group: "Adaptive",            thresholdLabel: "Min. Participation",         hasApprovalThreshold: false, thresholdUnit: "%" },
];

const VOTING_METHODS: Array<{ value: VotingMethod; label: string; description: string }> = [
  { value: "basic",           label: "Basic (FOR / AGAINST / ABSTAIN)", description: "Standard three-choice vote"                               },
  { value: "single_choice",   label: "Single Choice",                   description: "Voters pick exactly one option"                           },
  { value: "approval_voting", label: "Approval Voting",                 description: "Voters may select multiple valid options"                  },
  { value: "ranked_choice",   label: "Ranked Choice",                   description: "Voters rank options by preference"                        },
  { value: "weighted",        label: "Weighted Voting",                  description: "Voters distribute their voting power across options"       },
  { value: "quadratic",       label: "Quadratic Voting",                description: "Voting cost increases quadratically, reducing whale dominance" },
];

const QUORUM_GROUPS = ["Participation-Based", "Threshold-Based", "Adaptive"];

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22,1,0.36,1] } },
};

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1.5">{children}</div>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Label className="text-xs font-medium text-muted-foreground/90">{children}</Label>;
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div className="section-label">{title}</div>
      {children}
    </div>
  );
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active":    return "default";
    case "passed":    return "secondary";
    case "failed":
    case "cancelled": return "destructive";
    default:          return "outline";
  }
}

export default function Admin() {
  const { address } = useAccount();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projects, isLoading: isLoadingProjects } = useListProjects();
  const { data: allProposals, isLoading: isLoadingProposals } = useListProposals({});
  const { data: allAdmins, isLoading: isLoadingAdmins } = useListAdmins({});

  const adminProjectIds = React.useMemo(() => {
    if (!address || !allAdmins) return new Set<number>();
    return new Set(
      allAdmins
        .filter(a => a.walletAddress.toLowerCase() === address.toLowerCase())
        .map(a => a.projectId)
    );
  }, [allAdmins, address]);

  const isAdmin = adminProjectIds.size > 0;

  const adminProjects = React.useMemo(() => {
    if (!projects) return [];
    return projects.filter(p => adminProjectIds.has(p.id));
  }, [projects, adminProjectIds]);

  const { data: verifiedMoats, isLoading: isLoadingMoats } = useQuery<VerifiedMoat[]>({
    queryKey: ["verified-moats"],
    queryFn: async () => {
      const res = await fetch("/api/verified-moats");
      if (!res.ok) throw new Error("Failed to fetch verified moats");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const createProposal = useCreateProposal();
  const updateProposal = useUpdateProposal();
  const deleteProposal = useDeleteProposal();

  const myProposals = React.useMemo(() => {
    if (!address || !allProposals) return [];
    return allProposals.filter(p => p.createdBy?.toLowerCase() === address.toLowerCase());
  }, [allProposals, address]);

  const [editProposal, setEditProposal] = React.useState<Proposal | null>(null);
  const [editTitle, setEditTitle] = React.useState("");
  const [editDesc, setEditDesc] = React.useState("");
  const [editEnd, setEditEnd] = React.useState("");

  const toLocalInput = (iso: string) => {
    const d = new Date(iso);
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
  };

  const openEdit = (p: Proposal) => {
    setEditProposal(p);
    setEditTitle(p.title);
    setEditDesc(p.description ?? "");
    setEditEnd(toLocalInput(p.endDate));
  };

  const handleUpdateProposal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProposal) return;
    updateProposal.mutate({
      id: editProposal.id,
      data: {
        title: editTitle,
        description: editDesc,
        endDate: new Date(editEnd).toISOString(),
      },
    }, {
      onSuccess: () => {
        toast({ title: "Proposal updated" });
        setEditProposal(null);
        queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      },
      onError: (err: any) => toast({ title: "Error updating proposal", description: err.message, variant: "destructive" }),
    });
  };

  const handleDeleteProposal = (p: Proposal) => {
    if (!confirm(`Delete proposal "${p.title}"? This will cancel it permanently.`)) return;
    deleteProposal.mutate({ id: p.id }, {
      onSuccess: () => {
        toast({ title: "Proposal deleted" });
        queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      },
      onError: (err: any) => toast({ title: "Error deleting proposal", description: err.message, variant: "destructive" }),
    });
  };

  const [propMoatAddr, setPropMoatAddr] = React.useState("");
  const [propTitle, setPropTitle] = React.useState("");
  const [propDesc, setPropDesc] = React.useState("");
  const [propQuorum, setPropQuorum] = React.useState<QuorumType>("participation");
  const [propThreshold, setPropThreshold] = React.useState("10");
  const [propApprovalThreshold, setPropApprovalThreshold] = React.useState("51");
  const [propVotingMethod, setPropVotingMethod] = React.useState<VotingMethod>("basic");
  const [propOptions, setPropOptions] = React.useState<string[]>(["", ""]);
  const [propStart, setPropStart] = React.useState("");
  const [propEnd, setPropEnd] = React.useState("");
  const [isSubmittingProposal, setIsSubmittingProposal] = React.useState(false);

  const selectedMoat = verifiedMoats?.find(m => m.contractAddress === propMoatAddr);
  const selectedQuorumMeta = QUORUM_TYPES.find(q => q.value === propQuorum)!;
  const selectedVotingMeta = VOTING_METHODS.find(v => v.value === propVotingMethod)!;

  const isCustomMethod = propVotingMethod !== "basic";
  const cleanedOptions = propOptions.map(o => o.trim()).filter(o => o.length > 0);

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propMoatAddr || !selectedMoat) return;
    if (isCustomMethod && cleanedOptions.length < 2) {
      toast({ title: "Add at least 2 options", description: "This voting method needs custom options for voters to choose from.", variant: "destructive" });
      return;
    }
    if (isCustomMethod && new Set(cleanedOptions.map(o => o.toLowerCase())).size !== cleanedOptions.length) {
      toast({ title: "Options must be unique", description: "Remove duplicate options before submitting.", variant: "destructive" });
      return;
    }
    setIsSubmittingProposal(true);
    try {
      const existingProject = projects?.find(p => p.contractAddress.toLowerCase() === propMoatAddr.toLowerCase());
      let projectId: number;
      if (existingProject) {
        projectId = existingProject.id;
      } else {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: selectedMoat.name,
            contractAddress: selectedMoat.contractAddress,
            description: selectedMoat.description,
            logoUrl: null,
          }),
        });
        if (!res.ok) throw new Error("Failed to register project");
        const newProject = await res.json();
        projectId = newProject.id;
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      }

      createProposal.mutate({
        data: {
          title: propTitle,
          description: propDesc,
          projectId,
          quorumType: propQuorum,
          quorumThreshold: parseFloat(propThreshold),
          approvalThreshold: selectedQuorumMeta.hasApprovalThreshold ? parseFloat(propApprovalThreshold) : undefined,
          votingMethod: propVotingMethod,
          options: isCustomMethod ? cleanedOptions : undefined,
          startDate: new Date(propStart).toISOString(),
          endDate: new Date(propEnd).toISOString(),
          createdBy: address ?? "0x0000000000000000000000000000000000000000",
        }
      }, {
        onSuccess: () => {
          toast({ title: "Proposal created successfully" });
          setPropTitle(""); setPropDesc(""); setPropMoatAddr("");
          setPropThreshold("10"); setPropApprovalThreshold("51");
          setPropOptions(["", ""]);
          setPropStart(""); setPropEnd("");
          queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
          setIsSubmittingProposal(false);
        },
        onError: (err: any) => {
          toast({ title: "Error creating proposal", description: err.message, variant: "destructive" });
          setIsSubmittingProposal(false);
        }
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setIsSubmittingProposal(false);
    }
  };

  // ── Access gates ────────────────────────────────────────────────────────
  if (!address) {
    return (
      <motion.div
        variants={fadeUp} initial="initial" animate="animate"
        className="flex flex-col items-center justify-center gap-5 py-28 text-center max-w-sm mx-auto"
      >
        <div
          className="p-5 rounded-2xl"
          style={{
            background: "rgba(212,147,26,0.08)",
            border: "1px solid rgba(212,147,26,0.2)",
            boxShadow: "0 0 32px rgba(212,147,26,0.08)",
          }}
        >
          <Shield size={36} className="text-amber-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold mb-1.5">Connect Your Wallet</h2>
          <p className="text-sm text-muted-foreground">Connect your wallet to check your admin access.</p>
        </div>
      </motion.div>
    );
  }

  if (isLoadingAdmins) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <motion.div
        variants={fadeUp} initial="initial" animate="animate"
        className="flex flex-col items-center justify-center gap-5 py-28 text-center max-w-sm mx-auto"
      >
        <div
          className="p-5 rounded-2xl"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            boxShadow: "0 0 32px rgba(239,68,68,0.06)",
          }}
        >
          <Shield size={36} className="text-red-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold mb-1.5">Access Restricted</h2>
          <p className="text-sm text-muted-foreground">
            Your wallet{" "}
            <span
              className="font-mono px-1.5 py-0.5 rounded text-foreground text-xs"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              {address.slice(0,6)}…{address.slice(-4)}
            </span>{" "}
            has not been granted admin access.
          </p>
          <p className="text-xs text-muted-foreground mt-2">Contact the owner to be added as an administrator.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={fadeUp} initial="initial" animate="animate"
      className="space-y-6 max-w-5xl mx-auto"
    >
      {/* ── Page heading ─────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <div
          className="mt-1 p-1.5 rounded-lg shrink-0"
          style={{ background: "rgba(212,147,26,0.12)", border: "1px solid rgba(212,147,26,0.2)" }}
        >
          <Shield size={16} className="text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Admin Command Center</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Create proposals and manage the ones you submitted.</p>
        </div>
      </div>

      <Tabs defaultValue="proposals" className="w-full">
        <TabsList
          className="w-full justify-start bg-transparent rounded-none h-11 p-0 mb-6"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <TabsTrigger
            value="proposals"
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-0 h-full mr-6 text-sm font-medium"
          >
            Create Proposal
          </TabsTrigger>
          <TabsTrigger
            value="submitted"
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-0 h-full text-sm font-medium"
          >
            Submitted Proposals
          </TabsTrigger>
        </TabsList>

        {/* ── Create Proposal ─────────────────────────────────────────────── */}
        <TabsContent value="proposals">
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "rgba(11,26,50,0.82)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div
              className="px-5 md:px-6 py-4"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <h2 className="font-semibold text-sm">Launch New Proposal</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Create a governance proposal with configurable quorum and voting rules.</p>
            </div>
            <div className="p-5 md:p-6">
              <form onSubmit={handleCreateProposal} className="space-y-8">

                {/* ── Basic Info section ───────────────────────────────── */}
                <FormSection title="Basic Info">
                  <FieldRow>
                    <FieldLabel>Verified Moat</FieldLabel>
                    {isLoadingMoats ? (
                      <Skeleton className="h-10 w-full rounded-lg" />
                    ) : (
                      <Select value={propMoatAddr} onValueChange={setPropMoatAddr} required>
                        <SelectTrigger
                          className="h-10 text-sm"
                          style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}
                          data-testid="select-moat"
                        >
                          <SelectValue placeholder="Select a verified Moat…" />
                        </SelectTrigger>
                        <SelectContent className="max-h-72 overflow-y-auto">
                          {verifiedMoats
                            ?.filter(m => adminProjects.some(
                              p => p.contractAddress.toLowerCase() === m.contractAddress.toLowerCase()
                            ))
                            .map(m => (
                              <SelectItem key={m.contractAddress} value={m.contractAddress}>
                                <div className="flex flex-col gap-0.5 py-0.5">
                                  <span className="font-medium text-sm">{m.name}</span>
                                  <span className="font-mono text-[11px] text-muted-foreground">
                                    {m.contractAddress.slice(0, 6)}…{m.contractAddress.slice(-4)}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}
                    {selectedMoat && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <CheckCircle2 size={13} className="text-green-400" />
                        <span className="text-xs text-muted-foreground font-mono">{selectedMoat.contractAddress}</span>
                        {selectedMoat.tags.map(t => (
                          <span
                            key={t.name}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                            style={{ backgroundColor: t.color + "22", color: t.color, border: `1px solid ${t.color}44` }}
                          >
                            {t.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </FieldRow>

                  <FieldRow>
                    <FieldLabel>Proposal Title</FieldLabel>
                    <Input
                      value={propTitle}
                      onChange={e => setPropTitle(e.target.value)}
                      placeholder="Enter proposal title"
                      required
                      className="h-10 text-sm"
                      style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}
                    />
                  </FieldRow>

                  <FieldRow>
                    <FieldLabel>Description</FieldLabel>
                    <Textarea
                      value={propDesc}
                      onChange={e => setPropDesc(e.target.value)}
                      placeholder="Detailed description of the proposal"
                      required
                      className="text-sm min-h-[120px]"
                      style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}
                    />
                  </FieldRow>
                </FormSection>

                {/* ── Voting Config section ────────────────────────────── */}
                <FormSection title="Voting Configuration">
                  <FieldRow>
                    <FieldLabel>Voting Method</FieldLabel>
                    <Select value={propVotingMethod} onValueChange={v => setPropVotingMethod(v as VotingMethod)}>
                      <SelectTrigger
                        className="h-10 text-sm"
                        style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VOTING_METHODS.map(m => (
                          <SelectItem key={m.value} value={m.value}>
                            <span className="font-medium">{m.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedVotingMeta && (
                      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <Info size={12} className="mt-0.5 shrink-0 text-primary/50" />
                        {selectedVotingMeta.description}
                      </p>
                    )}
                  </FieldRow>

                  {isCustomMethod && (
                    <div
                      className="rounded-xl p-4 space-y-3"
                      style={{ background: "rgba(212,147,26,0.05)", border: "1px solid rgba(212,147,26,0.15)" }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-amber-400/80">Voting Options</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{cleanedOptions.length}/10</span>
                      </div>
                      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <Info size={12} className="mt-0.5 shrink-0 text-primary/50" />
                        Add the answers voters will choose from (2–10 options).
                      </p>
                      <div className="space-y-2">
                        {propOptions.map((opt, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground/60 w-5 shrink-0">{idx + 1}.</span>
                            <Input
                              value={opt}
                              onChange={e => {
                                const next = [...propOptions];
                                next[idx] = e.target.value;
                                setPropOptions(next);
                              }}
                              placeholder={`Option ${idx + 1}`}
                              className="h-9 text-sm"
                              style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}
                              maxLength={120}
                            />
                            <button
                              type="button"
                              className="p-2 rounded-lg transition-colors text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-20 shrink-0"
                              disabled={propOptions.length <= 2}
                              onClick={() => setPropOptions(propOptions.filter((_, i) => i !== idx))}
                              aria-label={`Remove option ${idx + 1}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="w-full py-2 rounded-lg text-xs font-medium transition-colors border border-dashed border-primary/20 text-primary/60 hover:border-primary/40 hover:text-primary/80 hover:bg-primary/5 disabled:opacity-40"
                        disabled={propOptions.length >= 10}
                        onClick={() => setPropOptions([...propOptions, ""])}
                      >
                        <Plus size={13} className="inline mr-1" /> Add Option
                      </button>
                    </div>
                  )}
                </FormSection>

                {/* ── Quorum section ───────────────────────────────────── */}
                <FormSection title="Quorum Settings">
                  <FieldRow>
                    <FieldLabel>Quorum Type</FieldLabel>
                    <Select value={propQuorum} onValueChange={v => setPropQuorum(v as QuorumType)}>
                      <SelectTrigger
                        className="h-10 text-sm"
                        style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-80 overflow-y-auto">
                        {QUORUM_GROUPS.map(group => (
                          <SelectGroup key={group}>
                            <SelectLabel className="text-[11px] text-muted-foreground/60 uppercase tracking-wide">{group}</SelectLabel>
                            {QUORUM_TYPES.filter(q => q.group === group).map(q => (
                              <SelectItem key={q.value} value={q.value}>
                                <span className="font-medium">{q.label}</span>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedQuorumMeta && (
                      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <Info size={12} className="mt-0.5 shrink-0 text-primary/50" />
                        {selectedQuorumMeta.description}
                      </p>
                    )}
                  </FieldRow>

                  <div className={`grid gap-4 ${selectedQuorumMeta?.hasApprovalThreshold ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2"}`}>
                    <FieldRow>
                      <FieldLabel>
                        {selectedQuorumMeta?.thresholdLabel ?? "Quorum Threshold"}
                        {selectedQuorumMeta?.thresholdUnit === "%" ? " (%)" : " (tokens)"}
                      </FieldLabel>
                      <Input
                        type="number"
                        min={selectedQuorumMeta?.thresholdUnit === "tokens" ? "1" : "1"}
                        max={selectedQuorumMeta?.thresholdUnit === "%" ? "100" : undefined}
                        step={selectedQuorumMeta?.thresholdUnit === "tokens" ? "1" : "0.1"}
                        value={propThreshold}
                        onChange={e => setPropThreshold(e.target.value)}
                        required
                        className="h-10 text-sm font-mono"
                        style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}
                      />
                    </FieldRow>

                    {selectedQuorumMeta?.hasApprovalThreshold ? (
                      <FieldRow>
                        <FieldLabel>Approval Threshold (%)</FieldLabel>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          step="0.1"
                          value={propApprovalThreshold}
                          onChange={e => setPropApprovalThreshold(e.target.value)}
                          required
                          className="h-10 text-sm font-mono"
                          style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}
                        />
                      </FieldRow>
                    ) : (
                      <div />
                    )}
                  </div>
                </FormSection>

                {/* ── Schedule section ─────────────────────────────────── */}
                <FormSection title="Schedule">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FieldRow>
                      <FieldLabel>Start Date</FieldLabel>
                      <Input
                        type="datetime-local"
                        value={propStart}
                        onChange={e => setPropStart(e.target.value)}
                        required
                        className="h-10 text-sm"
                        style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}
                      />
                    </FieldRow>
                    <FieldRow>
                      <FieldLabel>End Date</FieldLabel>
                      <Input
                        type="datetime-local"
                        value={propEnd}
                        onChange={e => setPropEnd(e.target.value)}
                        required
                        className="h-10 text-sm"
                        style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}
                      />
                    </FieldRow>
                  </div>
                </FormSection>

                <Button
                  type="submit"
                  disabled={isSubmittingProposal || createProposal.isPending}
                  className="w-full sm:w-auto h-11 px-8 font-semibold"
                  style={{
                    background: "linear-gradient(135deg, #D4931A, #B8771A)",
                    color: "#050d18",
                    boxShadow: "0 2px 16px rgba(212,147,26,0.3)",
                    border: "none",
                  }}
                >
                  {isSubmittingProposal || createProposal.isPending ? "Submitting…" : "Submit Proposal"}
                </Button>
              </form>
            </div>
          </div>
        </TabsContent>

        {/* ── Submitted Proposals ──────────────────────────────────────────── */}
        <TabsContent value="submitted">
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "rgba(11,26,50,0.82)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div
              className="px-5 md:px-6 py-4 flex items-center gap-2"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <FileText size={15} className="text-amber-400/70" />
              <h2 className="font-semibold text-sm">Submitted Proposals</h2>
            </div>
            <div className="p-5 md:p-6">
              {!address ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
                  <Info size={24} className="opacity-25" />
                  <p className="text-sm">Connect your wallet to view your submitted proposals.</p>
                </div>
              ) : isLoadingProposals ? (
                <div className="space-y-2.5">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
                </div>
              ) : myProposals.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
                  <FileText size={24} className="opacity-25" />
                  <p className="text-sm">You haven't submitted any proposals yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                      <TableHead className="text-xs">Title</TableHead>
                      <TableHead className="text-xs">Project</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Ends</TableHead>
                      <TableHead className="text-right text-xs">Votes</TableHead>
                      <TableHead className="w-24 text-right text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myProposals.map((p, i) => (
                      <TableRow
                        key={p.id}
                        style={{
                          borderColor: "rgba(255,255,255,0.04)",
                          background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                        }}
                      >
                        <TableCell className="font-medium text-sm max-w-[220px] truncate">{p.title}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{p.projectName}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(p.status)} className="capitalize text-[10px]">{p.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(p.endDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">{p.totalVotes ?? 0}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              className="p-1.5 rounded-lg transition-colors text-muted-foreground/50 hover:text-primary hover:bg-primary/10"
                              onClick={() => openEdit(p)}
                              aria-label={`Edit ${p.title}`}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              className="p-1.5 rounded-lg transition-colors text-red-400/40 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-20"
                              onClick={() => handleDeleteProposal(p)}
                              disabled={deleteProposal.isPending || p.status === "cancelled"}
                              aria-label={`Delete ${p.title}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
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

      {/* ── Edit Proposal Dialog ───────────────────────────────────────────── */}
      <Dialog open={!!editProposal} onOpenChange={open => { if (!open) setEditProposal(null); }}>
        <DialogContent
          style={{ background: "rgba(11,26,50,0.98)", border: "1px solid rgba(212,147,26,0.15)" }}
        >
          <DialogHeader>
            <DialogTitle>Edit Proposal</DialogTitle>
            <DialogDescription>Update the title, description, or end date of your proposal.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateProposal} className="space-y-4 mt-2">
            <FieldRow>
              <FieldLabel>Title</FieldLabel>
              <Input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                required
                className="h-10 text-sm"
                style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)" }}
              />
            </FieldRow>
            <FieldRow>
              <FieldLabel>Description</FieldLabel>
              <Textarea
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                required
                className="text-sm min-h-[110px]"
                style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)" }}
              />
            </FieldRow>
            <FieldRow>
              <FieldLabel>End Date</FieldLabel>
              <Input
                type="datetime-local"
                value={editEnd}
                onChange={e => setEditEnd(e.target.value)}
                required
                className="h-10 text-sm"
                style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)" }}
              />
            </FieldRow>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditProposal(null)} className="text-sm">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateProposal.isPending}
                className="text-sm font-semibold"
                style={{
                  background: "linear-gradient(135deg, #D4931A, #B8771A)",
                  color: "#050d18",
                  border: "none",
                }}
              >
                {updateProposal.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
