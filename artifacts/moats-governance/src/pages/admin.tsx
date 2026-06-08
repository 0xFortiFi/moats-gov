import React from "react";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import {
  useListProjects,
  useListAdmins,
  useCreateProposal,
  useCreateProject,
  useAddAdmin,
  useRemoveAdmin,
  QuorumType,
  VotingMethod,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, CheckCircle2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

type VerifiedMoat = {
  contractAddress: string;
  name: string;
  network: string;
  description: string | null;
  tags: Array<{ name: string; color: string }>;
};

// ── Quorum type metadata ───────────────────────────────────────────────────────
const QUORUM_TYPES: Array<{
  value: QuorumType;
  label: string;
  description: string;
  group: string;
  thresholdLabel: string;
  hasApprovalThreshold: boolean;
  thresholdUnit: "%" | "tokens";
}> = [
  {
    value: "participation",
    label: "Participation",
    description: "All votes count toward quorum: FOR + AGAINST + ABSTAIN",
    group: "Participation-Based",
    thresholdLabel: "Min. Participation",
    hasApprovalThreshold: false,
    thresholdUnit: "%",
  },
  {
    value: "approval",
    label: "Approval Only",
    description: "Only FOR votes count — a minimum level of active support is required",
    group: "Participation-Based",
    thresholdLabel: "Min. FOR Votes",
    hasApprovalThreshold: false,
    thresholdUnit: "%",
  },
  {
    value: "for_abstain",
    label: "For + Abstain",
    description: "FOR and ABSTAIN votes count — neutral participation is recognised",
    group: "Participation-Based",
    thresholdLabel: "Min. FOR + ABSTAIN",
    hasApprovalThreshold: false,
    thresholdUnit: "%",
  },
  {
    value: "percentage",
    label: "Percentage-Based",
    description: "A % of total eligible voting power must participate",
    group: "Threshold-Based",
    thresholdLabel: "Participation %",
    hasApprovalThreshold: false,
    thresholdUnit: "%",
  },
  {
    value: "fixed_token",
    label: "Fixed Token",
    description: "A fixed amount of voting power (tokens) must participate",
    group: "Threshold-Based",
    thresholdLabel: "Min. Voting Power (tokens)",
    hasApprovalThreshold: false,
    thresholdUnit: "tokens",
  },
  {
    value: "dual",
    label: "Dual Quorum",
    description: "Requires both a participation minimum AND a minimum approval percentage",
    group: "Threshold-Based",
    thresholdLabel: "Participation %",
    hasApprovalThreshold: true,
    thresholdUnit: "%",
  },
  {
    value: "veto",
    label: "Veto",
    description: "Proposal passes by default unless opposition reaches the threshold",
    group: "Threshold-Based",
    thresholdLabel: "Veto Threshold",
    hasApprovalThreshold: false,
    thresholdUnit: "%",
  },
  {
    value: "dynamic",
    label: "Dynamic",
    description: "Quorum adjusts automatically based on average historical participation × multiplier",
    group: "Adaptive",
    thresholdLabel: "Multiplier %",
    hasApprovalThreshold: false,
    thresholdUnit: "%",
  },
  {
    value: "time_weighted",
    label: "Time-Weighted",
    description: "Quorum requirement changes over the voting period (starts high, decreases)",
    group: "Adaptive",
    thresholdLabel: "Initial Quorum %",
    hasApprovalThreshold: false,
    thresholdUnit: "%",
  },
  {
    value: "tiered",
    label: "Tiered",
    description: "Different proposal types require different quorum levels (set the base %)",
    group: "Adaptive",
    thresholdLabel: "Base Quorum %",
    hasApprovalThreshold: false,
    thresholdUnit: "%",
  },
  {
    value: "security",
    label: "Security / Constitutional",
    description: "Elevated requirements for critical or protocol-level changes",
    group: "Adaptive",
    thresholdLabel: "Min. Participation",
    hasApprovalThreshold: false,
    thresholdUnit: "%",
  },
];

const VOTING_METHODS: Array<{
  value: VotingMethod;
  label: string;
  description: string;
}> = [
  { value: "basic", label: "Basic (FOR / AGAINST / ABSTAIN)", description: "Standard three-choice vote" },
  { value: "single_choice", label: "Single Choice", description: "Voters pick exactly one option" },
  { value: "approval_voting", label: "Approval Voting", description: "Voters may select multiple valid options" },
  { value: "ranked_choice", label: "Ranked Choice", description: "Voters rank options by preference" },
  { value: "weighted", label: "Weighted Voting", description: "Voters distribute their voting power across options" },
  { value: "quadratic", label: "Quadratic Voting", description: "Voting cost increases quadratically, reducing whale dominance" },
];

const QUORUM_GROUPS = ["Participation-Based", "Threshold-Based", "Adaptive"];

export default function Admin() {
  const { address } = useAccount();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projects, isLoading: isLoadingProjects } = useListProjects();
  const { data: admins } = useListAdmins({});

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
  const createProject = useCreateProject();
  const addAdmin = useAddAdmin();
  const removeAdmin = useRemoveAdmin();

  // Proposal form state
  const [propMoatAddr, setPropMoatAddr] = React.useState("");
  const [propTitle, setPropTitle] = React.useState("");
  const [propDesc, setPropDesc] = React.useState("");
  const [propQuorum, setPropQuorum] = React.useState<QuorumType>("participation");
  const [propThreshold, setPropThreshold] = React.useState("10");
  const [propApprovalThreshold, setPropApprovalThreshold] = React.useState("51");
  const [propVotingMethod, setPropVotingMethod] = React.useState<VotingMethod>("basic");
  const [propStart, setPropStart] = React.useState("");
  const [propEnd, setPropEnd] = React.useState("");
  const [isSubmittingProposal, setIsSubmittingProposal] = React.useState(false);

  const selectedMoat = verifiedMoats?.find(m => m.contractAddress === propMoatAddr);
  const selectedQuorumMeta = QUORUM_TYPES.find(q => q.value === propQuorum)!;
  const selectedVotingMeta = VOTING_METHODS.find(v => v.value === propVotingMethod)!;

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propMoatAddr || !selectedMoat) return;
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
          startDate: new Date(propStart).toISOString(),
          endDate: new Date(propEnd).toISOString(),
          createdBy: address ?? "0x0000000000000000000000000000000000000000",
        }
      }, {
        onSuccess: () => {
          toast({ title: "Proposal created successfully" });
          setPropTitle(""); setPropDesc(""); setPropMoatAddr("");
          setPropThreshold("10"); setPropApprovalThreshold("51");
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

  // Project form state
  const [projName, setProjName] = React.useState("");
  const [projContract, setProjContract] = React.useState("");
  const [projDesc, setProjDesc] = React.useState("");
  const [projLogo, setProjLogo] = React.useState("");

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    createProject.mutate({
      data: { name: projName, contractAddress: projContract, description: projDesc, logoUrl: projLogo }
    }, {
      onSuccess: () => {
        toast({ title: "Project registered successfully" });
        setProjName(""); setProjContract(""); setProjDesc(""); setProjLogo("");
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  // Admin form state
  const [adminWallet, setAdminWallet] = React.useState("");
  const [adminProjectId, setAdminProjectId] = React.useState("");

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    addAdmin.mutate({
      data: { walletAddress: adminWallet, projectId: parseInt(adminProjectId, 10) }
    }, {
      onSuccess: () => {
        toast({ title: "Admin added successfully" });
        setAdminWallet(""); setAdminProjectId("");
        queryClient.invalidateQueries({ queryKey: ["/api/admins"] });
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in zoom-in duration-500 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Admin Command Center</h1>
        <p className="text-muted-foreground">Manage projects, proposals, and permissions.</p>
      </div>

      <Tabs defaultValue="proposals" className="w-full">
        <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none h-12 p-0 space-x-6 mb-8">
          <TabsTrigger value="proposals" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-full">Create Proposal</TabsTrigger>
          <TabsTrigger value="projects" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-full">Manage Projects</TabsTrigger>
          <TabsTrigger value="admins" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-full">Manage Admins</TabsTrigger>
        </TabsList>

        {/* ── Create Proposal ─────────────────────────────────────────────── */}
        <TabsContent value="proposals">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Launch New Proposal</CardTitle>
              <CardDescription>Create a governance proposal with configurable quorum and voting rules.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateProposal} className="space-y-8">

                {/* Moat selector */}
                <div className="space-y-2">
                  <Label>Verified Moat</Label>
                  {isLoadingMoats ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select value={propMoatAddr} onValueChange={setPropMoatAddr} required>
                      <SelectTrigger className="bg-background" data-testid="select-moat">
                        <SelectValue placeholder="Select a verified Moat..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-72 overflow-y-auto">
                        {verifiedMoats?.map(m => (
                          <SelectItem key={m.contractAddress} value={m.contractAddress}>
                            <div className="flex flex-col gap-0.5 py-0.5">
                              <span className="font-medium text-sm">{m.name}</span>
                              <span className="font-mono text-[11px] text-muted-foreground">
                                {m.contractAddress.slice(0, 6)}...{m.contractAddress.slice(-4)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {selectedMoat && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <CheckCircle2 size={13} className="text-green-500" />
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
                </div>

                {/* Title & description */}
                <div className="space-y-2">
                  <Label>Proposal Title</Label>
                  <Input value={propTitle} onChange={(e) => setPropTitle(e.target.value)} placeholder="Enter proposal title" required className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={propDesc} onChange={(e) => setPropDesc(e.target.value)} placeholder="Detailed description of the proposal" required className="bg-background min-h-[130px]" />
                </div>

                {/* ── Voting Configuration ─────────────────────────────────── */}
                <div className="rounded-lg border border-border/60 p-5 space-y-6 bg-background/40">
                  <p className="text-sm font-semibold text-foreground/80 uppercase tracking-wide">Voting Configuration</p>

                  {/* Voting Method */}
                  <div className="space-y-2">
                    <Label>Voting Method</Label>
                    <Select value={propVotingMethod} onValueChange={(v) => setPropVotingMethod(v as VotingMethod)}>
                      <SelectTrigger className="bg-background">
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
                      <p className="flex items-start gap-1.5 text-xs text-muted-foreground pt-0.5">
                        <Info size={12} className="mt-0.5 shrink-0" />
                        {selectedVotingMeta.description}
                      </p>
                    )}
                  </div>

                  {/* Quorum Type */}
                  <div className="space-y-2">
                    <Label>Quorum Type</Label>
                    <Select value={propQuorum} onValueChange={(v) => setPropQuorum(v as QuorumType)}>
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-80 overflow-y-auto">
                        {QUORUM_GROUPS.map(group => (
                          <SelectGroup key={group}>
                            <SelectLabel className="text-[11px] text-muted-foreground/70 uppercase tracking-wide">{group}</SelectLabel>
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
                      <p className="flex items-start gap-1.5 text-xs text-muted-foreground pt-0.5">
                        <Info size={12} className="mt-0.5 shrink-0" />
                        {selectedQuorumMeta.description}
                      </p>
                    )}
                  </div>

                  {/* Threshold fields — context-aware */}
                  <div className={`grid gap-4 ${selectedQuorumMeta?.hasApprovalThreshold ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2"}`}>
                    <div className="space-y-2">
                      <Label>
                        {selectedQuorumMeta?.thresholdLabel ?? "Quorum Threshold"}
                        {selectedQuorumMeta?.thresholdUnit === "%" ? " (%)" : " (tokens)"}
                      </Label>
                      <Input
                        type="number"
                        min={selectedQuorumMeta?.thresholdUnit === "tokens" ? "1" : "1"}
                        max={selectedQuorumMeta?.thresholdUnit === "%" ? "100" : undefined}
                        step={selectedQuorumMeta?.thresholdUnit === "tokens" ? "1" : "0.1"}
                        value={propThreshold}
                        onChange={(e) => setPropThreshold(e.target.value)}
                        required
                        className="bg-background"
                      />
                    </div>

                    {selectedQuorumMeta?.hasApprovalThreshold ? (
                      <div className="space-y-2">
                        <Label>Approval Threshold (%)</Label>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          step="0.1"
                          value={propApprovalThreshold}
                          onChange={(e) => setPropApprovalThreshold(e.target.value)}
                          required
                          className="bg-background"
                        />
                      </div>
                    ) : (
                      <div /> /* keep grid balanced */
                    )}
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input type="datetime-local" value={propStart} onChange={(e) => setPropStart(e.target.value)} required className="bg-background" />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input type="datetime-local" value={propEnd} onChange={(e) => setPropEnd(e.target.value)} required className="bg-background" />
                  </div>
                </div>

                <Button type="submit" disabled={isSubmittingProposal || createProposal.isPending} className="w-full sm:w-auto">
                  {isSubmittingProposal || createProposal.isPending ? "Submitting..." : "Submit Proposal"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Manage Projects ──────────────────────────────────────────────── */}
        <TabsContent value="projects">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Register Project</CardTitle>
              <CardDescription>Add a new protocol or organization to the governance platform.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateProject} className="space-y-6">
                <div className="space-y-2">
                  <Label>Project Name</Label>
                  <Input value={projName} onChange={(e) => setProjName(e.target.value)} placeholder="e.g. Uniswap DAO" required className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label>Contract Address</Label>
                  <Input value={projContract} onChange={(e) => setProjContract(e.target.value)} placeholder="0x..." required className="bg-background font-mono" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={projDesc} onChange={(e) => setProjDesc(e.target.value)} placeholder="Project description" className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label>Logo URL (optional)</Label>
                  <Input value={projLogo} onChange={(e) => setProjLogo(e.target.value)} placeholder="https://..." className="bg-background" />
                </div>
                <Button type="submit" disabled={createProject.isPending} className="w-full sm:w-auto">
                  {createProject.isPending ? "Registering..." : "Register Project"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Manage Admins ────────────────────────────────────────────────── */}
        <TabsContent value="admins">
          <div className="space-y-8">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle>Add Administrator</CardTitle>
                <CardDescription>Grant admin rights to a wallet for a specific project.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddAdmin} className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="space-y-2 flex-1 w-full">
                    <Label>Project</Label>
                    <Select value={adminProjectId} onValueChange={setAdminProjectId} required>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects?.map(p => (
                          <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 flex-[2] w-full">
                    <Label>Wallet Address</Label>
                    <Input value={adminWallet} onChange={(e) => setAdminWallet(e.target.value)} placeholder="0x..." required className="bg-background font-mono" />
                  </div>
                  <Button type="submit" disabled={addAdmin.isPending} className="w-full md:w-auto">
                    <Plus className="mr-2" size={16} /> Add
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader>
                <CardTitle>Current Administrators</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead>Project</TableHead>
                      <TableHead>Wallet</TableHead>
                      <TableHead className="w-24">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {admins?.map((admin) => (
                      <TableRow key={admin.id} className="border-border/50">
                        <TableCell className="font-medium">
                          {projects?.find(p => p.id === admin.projectId)?.name || `Project #${admin.projectId}`}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{admin.walletAddress}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            onClick={() => {
                              if (confirm("Remove this admin?")) {
                                removeAdmin.mutate({ id: admin.id }, {
                                  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admins"] })
                                });
                              }
                            }}
                            disabled={removeAdmin.isPending}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
