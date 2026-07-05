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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, FileText, Activity, X, Settings2, Users, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAccount } from "wagmi";
import { motion } from "framer-motion";

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22,1,0.36,1] as [number,number,number,number] } },
};
const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl overflow-hidden ${className}`}
      style={{ background: "rgba(11,26,50,0.82)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      {children}
    </div>
  );
}

function PanelHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div
      className="px-5 md:px-6 py-4 flex items-start gap-3"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div
        className="p-1.5 rounded-lg shrink-0 mt-0.5"
        style={{ background: "rgba(212,147,26,0.1)", border: "1px solid rgba(212,147,26,0.18)" }}
      >
        <Icon size={14} className="text-amber-400" />
      </div>
      <div>
        <h2 className="font-semibold text-sm">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function statusColor(status: string) {
  switch (status) {
    case "active":    return { bg: "rgba(212,147,26,0.12)", color: "#D4931A", border: "rgba(212,147,26,0.25)" };
    case "passed":    return { bg: "rgba(74,222,128,0.1)",  color: "#4ade80", border: "rgba(74,222,128,0.2)"  };
    case "failed":
    case "cancelled": return { bg: "rgba(248,113,113,0.1)", color: "#f87171", border: "rgba(248,113,113,0.2)" };
    default:          return { bg: "rgba(148,163,184,0.1)", color: "#94a3b8", border: "rgba(148,163,184,0.2)" };
  }
}

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

  return (
    <motion.div
      className="space-y-6 max-w-5xl mx-auto"
      variants={stagger}
      initial="initial"
      animate="animate"
    >
      {/* ── Page heading ─────────────────────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <div className="flex items-start gap-3">
          <div
            className="mt-1 p-1.5 rounded-lg shrink-0"
            style={{ background: "rgba(212,147,26,0.12)", border: "1px solid rgba(212,147,26,0.2)" }}
          >
            <Settings2 size={16} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Owner Console</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage administrator permissions and all governance proposals.</p>
          </div>
        </div>
      </motion.div>

      {/* ── Add Administrator ─────────────────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <Panel>
          <PanelHeader icon={Users} title="Add Administrator" subtitle="Grant admin rights to a wallet for a specific project." />
          <div className="p-5 md:p-6">
            <form onSubmit={handleAddAdmin} className="flex flex-col md:flex-row gap-3 items-end">
              <div className="space-y-1.5 flex-1 w-full">
                <Label className="text-xs text-muted-foreground">Project</Label>
                <Select value={adminProjectId} onValueChange={setAdminProjectId} required>
                  <SelectTrigger
                    className="h-10 text-sm"
                    style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}
                  >
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {projects?.map(p => (
                      <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 flex-[2] w-full">
                <Label className="text-xs text-muted-foreground">Wallet Address</Label>
                <Input
                  value={adminWallet}
                  onChange={e => setAdminWallet(e.target.value)}
                  placeholder="0x..."
                  required
                  className="h-10 font-mono text-sm"
                  style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}
                />
              </div>
              <Button
                type="submit"
                disabled={addAdmin.isPending}
                className="h-10 px-5 w-full md:w-auto font-semibold"
                style={{
                  background: "linear-gradient(135deg, #D4931A, #B8771A)",
                  color: "#050d18",
                  boxShadow: "0 2px 12px rgba(212,147,26,0.25)",
                  border: "none",
                }}
              >
                <Plus size={15} className="mr-1.5" />
                {addAdmin.isPending ? "Adding…" : "Add"}
              </Button>
            </form>
          </div>
        </Panel>
      </motion.div>

      {/* ── Current Administrators ────────────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <Panel>
          <PanelHeader icon={Shield} title="Current Administrators" />
          <div className="p-5 md:p-6">
            <Table>
              <TableHeader>
                <TableRow style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <TableHead className="text-xs">Project</TableHead>
                  <TableHead className="text-xs">Wallet</TableHead>
                  <TableHead className="w-20 text-xs">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8 text-sm">
                      No administrators added yet.
                    </TableCell>
                  </TableRow>
                )}
                {admins?.map((admin, i) => (
                  <TableRow
                    key={admin.id}
                    style={{
                      borderColor: "rgba(255,255,255,0.04)",
                      background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                    }}
                  >
                    <TableCell className="font-medium text-sm">
                      {projects?.find(p => p.id === admin.projectId)?.name || `Project #${admin.projectId}`}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground break-all">
                      {admin.walletAddress}
                    </TableCell>
                    <TableCell>
                      <button
                        className="p-2 rounded-lg transition-colors text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
                        onClick={() => {
                          if (confirm("Remove this admin?")) {
                            removeAdmin.mutate({ id: admin.id }, {
                              onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admins"] })
                            });
                          }
                        }}
                        disabled={removeAdmin.isPending}
                        aria-label="Remove admin"
                      >
                        <Trash2 size={15} />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>
      </motion.div>

      {/* ── All Proposals ─────────────────────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <Panel>
          <PanelHeader icon={FileText} title="All Proposals" subtitle="Edit or cancel any governance proposal across all projects." />
          <div className="p-5 md:p-6">
            {isLoadingProposals ? (
              <div className="space-y-2.5">
                {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
              </div>
            ) : allProposals?.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
                <Activity size={28} className="opacity-25" />
                <p className="text-sm">No proposals have been created yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                      <TableHead className="text-xs">Title</TableHead>
                      <TableHead className="text-xs hidden sm:table-cell">Project</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs hidden md:table-cell">Created By</TableHead>
                      <TableHead className="text-xs hidden md:table-cell">Ends</TableHead>
                      <TableHead className="w-20 text-right text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allProposals?.map((p, i) => {
                      const sc = statusColor(p.status);
                      return (
                        <TableRow
                          key={p.id}
                          style={{
                            borderColor: "rgba(255,255,255,0.04)",
                            background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                          }}
                        >
                          <TableCell className="font-medium text-sm max-w-[160px] truncate">{p.title}</TableCell>
                          <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{p.projectName}</TableCell>
                          <TableCell>
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize"
                              style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
                            >
                              {p.status}
                            </span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell font-mono text-[11px] text-muted-foreground">
                            {p.createdBy ? `${p.createdBy.slice(0, 6)}…${p.createdBy.slice(-4)}` : "—"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(p.endDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                className="p-1.5 rounded-lg transition-colors text-muted-foreground/50 hover:text-primary hover:bg-primary/10"
                                onClick={() => openEdit(p)}
                                aria-label={`Edit ${p.title}`}
                              >
                                <Pencil size={14} />
                              </button>
                              {p.status === "cancelled" ? (
                                <button
                                  className="p-1.5 rounded-lg transition-colors text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
                                  onClick={() => handleRemoveProposal(p)}
                                  disabled={deleteProposal.isPending}
                                  title="Permanently remove this proposal"
                                  aria-label={`Remove ${p.title}`}
                                >
                                  <X size={14} />
                                </button>
                              ) : (
                                <button
                                  className="p-1.5 rounded-lg transition-colors text-red-400/40 hover:text-red-400 hover:bg-red-500/10"
                                  onClick={() => handleCancelProposal(p)}
                                  disabled={deleteProposal.isPending}
                                  title="Cancel this proposal"
                                  aria-label={`Cancel ${p.title}`}
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </Panel>
      </motion.div>

      {/* ── Edit Proposal Dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!editProposal} onOpenChange={open => { if (!open) setEditProposal(null); }}>
        <DialogContent
          style={{ background: "rgba(11,26,50,0.98)", border: "1px solid rgba(212,147,26,0.15)" }}
        >
          <DialogHeader>
            <DialogTitle>Edit Proposal</DialogTitle>
            <DialogDescription>Update the title, description, or end date of this proposal.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateProposal} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Title</Label>
              <Input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                required
                style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)" }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Description</Label>
              <textarea
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                required
                className="w-full min-h-[110px] rounded-lg border text-sm px-3 py-2.5 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  borderColor: "rgba(255,255,255,0.1)",
                  color: "inherit",
                  resize: "vertical",
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">End Date</Label>
              <Input
                type="datetime-local"
                value={editEnd}
                onChange={e => setEditEnd(e.target.value)}
                required
                style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)" }}
              />
            </div>
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
