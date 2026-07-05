import { useListProjects } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { BoxSelect, Activity, ArrowUpRight, ExternalLink, FolderOpen, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { useSelectedNetwork, networkLabel } from "@/components/layout";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22,1,0.36,1] as [number,number,number,number] } },
};
const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

export default function Projects() {
  const { data: projects, isLoading } = useListProjects();
  const selectedNetwork = useSelectedNetwork();

  const filtered = selectedNetwork === "all"
    ? projects
    : projects?.filter(p => p.network === selectedNetwork);

  return (
    <div className="space-y-7 md:space-y-9 max-w-6xl mx-auto">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <motion.div variants={fadeUp} initial="initial" animate="animate">
        <div className="flex items-start gap-3 mb-1">
          <div
            className="mt-1 p-1.5 rounded-lg shrink-0"
            style={{ background: "rgba(212,147,26,0.12)", border: "1px solid rgba(212,147,26,0.2)" }}
          >
            <FolderOpen size={16} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Governance Projects</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-0.5">
              Protocols and organizations governed by Moat Points.
            </p>
          </div>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-52 w-full rounded-xl" />)}
        </div>
      ) : filtered?.length === 0 ? (
        <motion.div variants={fadeUp} initial="initial" animate="animate">
          <div
            className="rounded-xl border border-dashed border-border/50 flex flex-col items-center justify-center h-64 text-muted-foreground"
          >
            <BoxSelect size={36} className="mb-3 opacity-25" />
            <p className="text-sm font-medium">
              {selectedNetwork === "all"
                ? "No projects registered yet."
                : `No projects on ${networkLabel(selectedNetwork)} yet.`}
            </p>
          </div>
        </motion.div>
      ) : (
        <motion.div
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          variants={stagger}
          initial="initial"
          animate="animate"
        >
          {filtered?.map(project => (
            <motion.div key={project.id} variants={fadeUp}>
              <Link href={`/projects/${project.id}`} className="block h-full group">
                <div
                  className="h-full rounded-xl p-5 flex flex-col card-hover-glow cursor-pointer relative overflow-hidden"
                  style={{
                    background: "rgba(11,26,50,0.82)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  {/* Subtle corner glow on hover */}
                  <div
                    className="absolute top-0 right-0 w-24 h-24 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500"
                    style={{ background: "radial-gradient(circle at top right, rgba(212,147,26,0.08), transparent 70%)" }}
                  />

                  {/* Header row */}
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
                      style={{ background: "rgba(212,147,26,0.1)", border: "1px solid rgba(212,147,26,0.18)" }}
                    >
                      {project.logoUrl ? (
                        <img
                          src={project.logoUrl}
                          alt={`${project.name} logo`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          onError={e => {
                            const el = e.currentTarget;
                            el.style.display = "none";
                            el.nextElementSibling?.classList.remove("hidden");
                          }}
                        />
                      ) : null}
                      <span className={`text-sm font-bold gold-text ${project.logoUrl ? "hidden" : ""}`}>
                        {project.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {project.network ? (
                        <span
                          className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
                          style={{
                            background: "rgba(212,147,26,0.08)",
                            border: "1px solid rgba(212,147,26,0.18)",
                            color: "rgba(212,147,26,0.85)",
                          }}
                        >
                          <Globe size={9} />
                          {networkLabel(project.network)}
                        </span>
                      ) : null}
                      <ArrowUpRight
                        size={16}
                        className="text-muted-foreground/30 group-hover:text-primary transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      />
                    </div>
                  </div>

                  {/* Name + description */}
                  <h3 className="font-bold text-base md:text-lg mb-1.5 group-hover:text-amber-300 transition-colors leading-snug">
                    {project.name}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-5 flex-1 leading-relaxed">
                    {project.description || "No description provided."}
                  </p>

                  {/* Stats */}
                  <div
                    className="space-y-2.5 pt-4"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Activity size={13} strokeWidth={1.8} />
                        Total Proposals
                      </span>
                      <span className="font-mono font-semibold">{project.totalProposals || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: "#D4931A", boxShadow: "0 0 5px rgba(212,147,26,0.5)" }}
                        />
                        Active Now
                      </span>
                      <span
                        className="font-mono font-semibold"
                        style={{ color: project.activeProposals ? "#D4931A" : undefined }}
                      >
                        {project.activeProposals || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Contract</span>
                      <div
                        className="flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded-md"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}
                      >
                        {project.contractAddress.slice(0, 6)}…{project.contractAddress.slice(-4)}
                        <ExternalLink size={10} className="opacity-40" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
