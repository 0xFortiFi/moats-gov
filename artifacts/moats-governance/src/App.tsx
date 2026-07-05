import { WagmiProvider, useAccount } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { wagmiAdapter } from "@/lib/wallet";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import ProjectDetail from "@/pages/project-detail";
import Proposals from "@/pages/proposals";
import ProposalDetail from "@/pages/proposal-detail";
import Admin from "@/pages/admin";
import Owner from "@/pages/owner";
import NotFound from "@/pages/not-found";
import { setWalletAddress } from "@workspace/api-client-react";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

const queryClient = new QueryClient();

const pageVariants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -10 },
};

const pageTransition = {
  duration: 0.22,
  ease: [0.22, 1, 0.36, 1] as const,
};

function WalletSync() {
  const { address } = useAccount();
  useEffect(() => {
    setWalletAddress(address ?? null);
  }, [address]);
  return null;
}

function Router() {
  const [location] = useLocation();
  const pageKey = location.split("/")[1] || "home";

  return (
    <Layout>
      <WalletSync />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pageKey}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={pageTransition}
          className="min-h-full"
        >
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/projects" component={Projects} />
            <Route path="/projects/:id" component={ProjectDetail} />
            <Route path="/proposals" component={Proposals} />
            <Route path="/proposals/:id" component={ProposalDetail} />
            <Route path="/admin" component={Admin} />
            <Route path="/owner" component={Owner} />
            <Route component={NotFound} />
          </Switch>
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}

function App() {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
