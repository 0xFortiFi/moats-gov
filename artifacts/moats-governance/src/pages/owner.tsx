import React from "react";
import {
  useListProjects,
  useListAdmins,
  useListProposals,
  useAddAdmin,
  useRemoveAdmin,
  useUpdateProposal,
  useDeleteProposal,
  Proposal,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, FileText, Activity, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAccount } from "wagmi";

export default function Owner() {
  const { toast } = useToast();
  const { address } = useAccount();
  const queryClient = useQueryClient();

  const { data: projects } = useListProjects();
  const { data: admins } = useListAdmins({});
  const { data: allProposals, isLoading: isLoadingProposals } = useListProposals({});

  const addAdmin = useAddAdmin();
  const removeAdmin = useRemoveAdmin();
  const updateProposal = useUpdateProposal();
  const deleteProposal = useDeleteProposal();

  const [adminWallet, setAdminWallet] = React.useState("");
  const [adminProjectId, setAdminProjectId] = React.useState("");

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

  const handleCancelProposal = (p: Proposal) => {
    if (!confirm(`Cancel proposal "${p.title}"? This will mark it as cancelled.`)) return;
    deleteProposal.mutate({ id: p.id }, {
      onSuccess: () => {
        toast({ title: "Proposal cancelled" });
        queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  const handleRemoveProposal = (p: Proposal) => {
    if (!confirm(`Permanently remove "${p.title}"? This will delete it from the database and cannot be undone.`)) return;
    deleteProposal.mutate({ id: p.id }, {
      onSuccess: () => {
        toast({ title: "Proposal removed" });
        queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  const statusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "active": return "default";
      case "passed": return "secondary";
      case "failed":
      case "cancelled": return "destructive";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in zoom-in duration-500 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1 md:mb-2">Owner Console</h1>
        <p className="text-sm md:text-base text-muted-foreground">Manage administrator permissions and all governance proposals.</p>
      </div>

      <div className="space-y-8">

        {/* ── Add Administrator ─────────────────────────────────────────────── */}
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
                  <SelectContent className="max-h-60 overflow-y-auto">
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

        {/* ── Current Administrators ────────────────────────────────────────── */}
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
                {admins?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">No administrators added yet.</TableCell>
                  </TableRow>
                )}
                {admins?.map((admin) => (
                  <TableRow key={admin.id} className="border-border/50">
                    <TableCell className="font-medium">
                      {projects?.find(p => p.id === admin.projectId)?.name || `Project #${admin.projectId}`}
                    </TableCell>
                    <TableCell className="font-mono text-sm break-all">{admin.walletAddress}</TableCell>
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

        {/* ── All Proposals ─────────────────────────────────────────────────── */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle>All Proposals</CardTitle>
            <CardDescription>Edit or cancel any governance proposal across all projects.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingProposals ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : allProposals?.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
                <FileText size={28} className="opacity-50" />
                <p>No proposals have been created yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead>Title</TableHead>
                      <TableHead className="hidden sm:table-cell">Project</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Created By</TableHead>
                      <TableHead className="hidden md:table-cell">Ends</TableHead>
                      <TableHead className="w-24 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allProposals?.map((p) => (
                      <TableRow key={p.id} className="border-border/50">
                        <TableCell className="font-medium max-w-[160px] truncate">{p.title}</TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{p.projectName}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(p.status)} className="capitalize text-xs">{p.status}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">
                          {p.createdBy ? `${p.createdBy.slice(0, 6)}…${p.createdBy.slice(-4)}` : "—"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground text-sm whitespace-nowrap">
                          {new Date(p.endDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                              onClick={() => openEdit(p)}
                              aria-label={`Edit ${p.title}`}
                            >
                              <Pencil size={15} />
                            </Button>
                            {p.status === "cancelled" ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600 hover:text-red-700 hover:bg-red-600/10"
                                onClick={() => handleRemoveProposal(p)}
                                disabled={deleteProposal.isPending}
                                title="Permanently remove this proposal"
                                aria-label={`Remove ${p.title}`}
                              >
                                <X size={15} />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                onClick={() => handleCancelProposal(p)}
                                disabled={deleteProposal.isPending}
                                title="Cancel this proposal"
                                aria-label={`Cancel ${p.title}`}
                              >
                                <Trash2 size={15} />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Edit Proposal Dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!editProposal} onOpenChange={(open) => { if (!open) setEditProposal(null); }}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>Edit Proposal</DialogTitle>
            <DialogDescription>Update the title, description, or end date of this proposal.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateProposal} className="space-y-5">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required className="bg-background" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                required
                className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="datetime-local" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} required className="bg-background" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditProposal(null)}>Cancel</Button>
              <Button type="submit" disabled={updateProposal.isPending}>
                {updateProposal.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
