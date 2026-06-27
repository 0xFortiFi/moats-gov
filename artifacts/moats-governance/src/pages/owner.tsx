import React from "react";
import {
  useListProjects,
  useListAdmins,
  useAddAdmin,
  useRemoveAdmin,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Owner() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projects } = useListProjects();
  const { data: admins } = useListAdmins({});

  const addAdmin = useAddAdmin();
  const removeAdmin = useRemoveAdmin();

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
        <h1 className="text-3xl font-bold tracking-tight mb-2">Owner Console</h1>
        <p className="text-muted-foreground">Manage administrator permissions across projects.</p>
      </div>

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
    </div>
  );
}
