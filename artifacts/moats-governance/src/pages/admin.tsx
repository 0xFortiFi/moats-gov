import React, { useState } from "react";
import { useAccount } from "wagmi";
import { 
  useListProjects, 
  useListAdmins, 
  useCreateProposal, 
  useCreateProject, 
  useAddAdmin,
  useRemoveAdmin,
  ProposalInputQuorumType
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Plus, Trash2, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Admin() {
  const { isConnected, address } = useAccount();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projects, isLoading: isLoadingProjects } = useListProjects();
  const { data: admins, isLoading: isLoadingAdmins } = useListAdmins({});

  const isAdmin = admins?.some(a => a.walletAddress.toLowerCase() === address?.toLowerCase());

  const createProposal = useCreateProposal();
  const createProject = useCreateProject();
  const addAdmin = useAddAdmin();
  const removeAdmin = useRemoveAdmin();

  const [propTitle, setPropTitle] = React.useState("");
  const [propDesc, setPropDesc] = React.useState("");
  const [propProjectId, setPropProjectId] = React.useState("");
  const [propQuorum, setPropQuorum] = React.useState<ProposalInputQuorumType>("simple_majority");
  const [propThreshold, setPropThreshold] = React.useState("51");
  const [propStart, setPropStart] = React.useState("");
  const [propEnd, setPropEnd] = React.useState("");

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    createProposal.mutate({
      data: {
        title: propTitle,
        description: propDesc,
        projectId: parseInt(propProjectId, 10),
        quorumType: propQuorum,
        quorumThreshold: parseInt(propThreshold, 10),
        startDate: new Date(propStart).toISOString(),
        endDate: new Date(propEnd).toISOString(),
        createdBy: address,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Proposal created successfully" });
        setPropTitle(""); setPropDesc(""); setPropProjectId("");
        setPropThreshold("51"); setPropStart(""); setPropEnd("");
        queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  const [projName, setProjName] = React.useState("");
  const [projContract, setProjContract] = React.useState("");
  const [projDesc, setProjDesc] = React.useState("");
  const [projLogo, setProjLogo] = React.useState("");

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    createProject.mutate({
      data: {
        name: projName,
        contractAddress: projContract,
        description: projDesc,
        logoUrl: projLogo
      }
    }, {
      onSuccess: () => {
        toast({ title: "Project registered successfully" });
        setProjName(""); setProjContract(""); setProjDesc(""); setProjLogo("");
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  const [adminWallet, setAdminWallet] = React.useState("");
  const [adminProjectId, setAdminProjectId] = React.useState("");

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    addAdmin.mutate({
      data: {
        walletAddress: adminWallet,
        projectId: parseInt(adminProjectId, 10)
      }
    }, {
      onSuccess: () => {
        toast({ title: "Admin added successfully" });
        setAdminWallet(""); setAdminProjectId("");
        queryClient.invalidateQueries({ queryKey: ["/api/admins"] });
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <ShieldAlert size={48} className="text-muted-foreground opacity-50" />
        <h2 className="text-2xl font-bold tracking-tight">Admin Access Required</h2>
        <p className="text-muted-foreground max-w-md">Connect your wallet to access the administration panel.</p>
        <appkit-button />
      </div>
    );
  }

  if (!isLoadingAdmins && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <AlertCircle size={48} className="text-red-500 opacity-50" />
        <h2 className="text-2xl font-bold tracking-tight">Unauthorized Access</h2>
        <p className="text-muted-foreground max-w-md">Your connected wallet ({address?.slice(0, 6)}...{address?.slice(-4)}) does not have administrator privileges.</p>
      </div>
    );
  }

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

        <TabsContent value="proposals">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Launch New Proposal</CardTitle>
              <CardDescription>Create a new governance proposal for an existing project.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateProposal} className="space-y-6">
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select value={propProjectId} onValueChange={setPropProjectId} required>
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
                
                <div className="space-y-2">
                  <Label>Proposal Title</Label>
                  <Input value={propTitle} onChange={(e) => setPropTitle(e.target.value)} placeholder="Enter proposal title" required className="bg-background" />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={propDesc} onChange={(e) => setPropDesc(e.target.value)} placeholder="Detailed description of the proposal" required className="bg-background min-h-[150px]" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Quorum Type</Label>
                    <Select value={propQuorum} onValueChange={(v) => setPropQuorum(v as any)} required>
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simple_majority">Simple Majority</SelectItem>
                        <SelectItem value="supermajority">Supermajority</SelectItem>
                        <SelectItem value="token_weighted">Token Weighted</SelectItem>
                        <SelectItem value="unanimous">Unanimous</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quorum Threshold (%)</Label>
                    <Input type="number" min="1" max="100" value={propThreshold} onChange={(e) => setPropThreshold(e.target.value)} required className="bg-background" />
                  </div>
                </div>

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

                <Button type="submit" disabled={createProposal.isPending} className="w-full sm:w-auto">
                  {createProposal.isPending ? "Submitting..." : "Submit Proposal"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

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
