import { useListProjects } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { BoxSelect, Activity, ArrowRight, ExternalLink } from "lucide-react";

export default function Projects() {
  const { data: projects, isLoading } = useListProjects();

  return (
    <div className="space-y-8 animate-in fade-in zoom-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Governance Projects</h1>
        <p className="text-muted-foreground">Protocols and organizations governed by Moat Points.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : projects?.length === 0 ? (
        <Card className="border-dashed bg-transparent">
          <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <BoxSelect size={48} className="mb-4 opacity-50" />
            <p>No projects registered yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects?.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="h-full transition-all hover:border-primary/50 group cursor-pointer hover:shadow-lg hover:shadow-primary/5">
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      {project.logoUrl ? (
                        <img src={project.logoUrl} alt={project.name} className="w-10 h-10 rounded-full border border-border bg-card" />
                      ) : (
                        <div className="w-10 h-10 rounded-full border border-border bg-muted flex items-center justify-center text-muted-foreground">
                          {project.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{project.name}</h3>
                      </div>
                    </div>
                    <ArrowRight className="text-muted-foreground group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0" size={20} />
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2 mb-6 flex-1">
                    {project.description || "No description provided."}
                  </p>

                  <div className="space-y-4 mt-auto">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1"><Activity size={14} /> Total Proposals</span>
                      <span className="font-mono font-medium">{project.totalProposals || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> Active</span>
                      <span className="font-mono font-medium">{project.activeProposals || 0}</span>
                    </div>

                    <div className="pt-4 border-t border-border flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Contract</span>
                      <div className="flex items-center gap-1 text-xs font-mono bg-muted px-2 py-1 rounded">
                        {project.contractAddress.slice(0, 6)}...{project.contractAddress.slice(-4)}
                        <ExternalLink size={12} className="opacity-50" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
