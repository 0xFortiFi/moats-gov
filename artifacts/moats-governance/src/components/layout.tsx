import { Link, useLocation, useSearch } from "wouter";
import { appKit } from "@/lib/wallet";
import { useAccount } from "wagmi";
import logoUrl from "@assets/IMG_1555_1780933782029.jpg";
import { LayoutDashboard, FolderOpen, FileText, Shield, Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ethIcon from "@/assets/networks/eth.png";
import baseIcon from "@/assets/networks/base.png";
import bnbIcon from "@/assets/networks/bnb.png";
import monadIcon from "@/assets/networks/monad.png";
import grottoIcon from "@/assets/networks/grotto.png";
import blazeIcon from "@/assets/networks/blaze.png";
import avalancheIcon from "@/assets/networks/avalanche.png";

export const NETWORKS = [
  { id: "eth", label: "Ethereum", icon: ethIcon },
  { id: "base", label: "Base", icon: baseIcon },
  { id: "bsc", label: "BNB", icon: bnbIcon },
  { id: "monad", label: "Monad", icon: monadIcon },
  { id: "thegrotto", label: "The Grotto", icon: grottoIcon },
  { id: "blaze", label: "Blaze", icon: blazeIcon },
  { id: "avalanche", label: "Avalanche", icon: avalancheIcon },
] as const;

export function networkIcon(id: string | null | undefined): string | undefined {
  return NETWORKS.find(n => n.id === id)?.icon;
}

export function networkLabel(id: string | null | undefined): string {
  const n = NETWORKS.find(n => n.id === id);
  return n?.label ?? (id ?? "Unknown");
}

export function useSelectedNetwork(): string {
  const search = useSearch();
  return new URLSearchParams(search).get("network") ?? "all";
}

function NetworkSelector() {
  const search = useSearch();
  const [location, navigate] = useLocation();
  const current = new URLSearchParams(search).get("network") ?? "all";

  const handleChange = (value: string) => {
    const params = new URLSearchParams(search);
    if (value === "all") {
      params.delete("network");
    } else {
      params.set("network", value);
    }
    const qs = params.toString();
    navigate(`${location}${qs ? `?${qs}` : ""}`, { replace: true });
  };

  return (
    <Select value={current} onValueChange={handleChange}>
      <SelectTrigger
        className="h-8 md:h-9 w-auto gap-1.5 rounded-full px-2.5 md:px-3.5 text-xs md:text-sm font-medium border-0 focus:ring-0 focus:ring-offset-0"
        style={{
          background: "rgba(11,26,50,0.7)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "rgba(220,230,242,0.9)",
        }}
        aria-label="Select network"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        className="rounded-xl"
        style={{
          background: "rgba(8,18,34,0.98)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "rgba(220,230,242,0.9)",
        }}
      >
        <SelectItem value="all">
          <span className="flex items-center gap-2">
            <Globe size={14} className="text-amber-400 shrink-0" />
            All Networks
          </span>
        </SelectItem>
        {NETWORKS.map(n => (
          <SelectItem key={n.id} value={n.id}>
            <span className="flex items-center gap-2">
              <img
                src={n.icon}
                alt=""
                className="w-4 h-4 rounded-full object-cover shrink-0"
              />
              {n.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function WalletButton() {
  const { address, isConnected } = useAccount();

  const handleClick = () => {
    appKit.open();
  };

  if (isConnected && address) {
    return (
      <button
        onClick={handleClick}
        className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all duration-200"
        style={{
          background: "rgba(212,147,26,0.08)",
          border: "1px solid rgba(212,147,26,0.3)",
          color: "#D4931A",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(212,147,26,0.16)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 16px rgba(212,147,26,0.12)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(212,147,26,0.08)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
        }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-green-400 shrink-0 dot-online" />
        <span className="font-mono">
          {address.slice(0, 6)}…{address.slice(-4)}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="px-3 py-1.5 md:px-5 md:py-2 rounded-full text-xs md:text-sm font-semibold transition-all duration-200 whitespace-nowrap"
      style={{
        background: "linear-gradient(135deg, #D4931A, #B8771A)",
        color: "#050d18",
        boxShadow: "0 2px 12px rgba(212,147,26,0.3)",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(212,147,26,0.45)";
        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 12px rgba(212,147,26,0.3)";
        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
      }}
    >
      Connect Wallet
    </button>
  );
}

const navItems = [
  { href: "/",          label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects",  label: "Projects",  icon: FolderOpen },
  { href: "/proposals", label: "Proposals", icon: FileText },
  { href: "/admin",     label: "Admin",     icon: Shield },
];

function BottomNav() {
  const [location] = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-bottom"
      style={{
        background: "rgba(5, 13, 24, 0.95)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-stretch h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center gap-1 flex-1 h-full relative transition-all duration-200"
              style={{ color: isActive ? "#D4931A" : "rgba(148,163,184,0.6)" }}
            >
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b-full"
                  style={{
                    width: "32px",
                    height: "2.5px",
                    background: "linear-gradient(90deg, #F0B429, #D4931A)",
                    boxShadow: "0 0 8px rgba(212,147,26,0.6)",
                  }}
                />
              )}
              <span
                className="transition-all duration-200"
                style={{ transform: isActive ? "scale(1.15)" : "scale(1)" }}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              </span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground dark">
      <header
        className="sticky top-0 z-50 w-full"
        style={{
          background: "rgba(5, 13, 24, 0.88)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(255,255,255,0.055)",
          boxShadow: "0 1px 0 rgba(212,147,26,0.06), 0 4px 24px rgba(0,0,0,0.25)",
        }}
      >
        <div className="container mx-auto px-4 h-14 md:h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 md:gap-3 group">
            <div
              className="relative transition-all duration-300"
              style={{
                filter: "drop-shadow(0 0 8px rgba(212,147,26,0.2))",
              }}
            >
              <img
                src={logoUrl}
                alt="Moats Logo"
                className="h-7 w-7 md:h-8 md:w-8 rounded-full object-cover transition-all duration-300 group-hover:scale-105"
                style={{ border: "1.5px solid rgba(212,147,26,0.35)" }}
              />
            </div>
            <span className="font-bold text-base md:text-lg tracking-tight hidden sm:inline-flex items-center gap-0">
              <span className="text-white">Moats</span>
              <span className="ml-1 gold-text">Governance</span>
            </span>
          </Link>

          <nav
            className="hidden md:flex items-center gap-0.5 rounded-full px-1.5 py-1.5"
            style={{
              background: "rgba(11,26,50,0.7)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 relative"
                  style={
                    isActive
                      ? {
                          background: "linear-gradient(135deg, rgba(212,147,26,0.22), rgba(212,147,26,0.08))",
                          color: "#F0B429",
                          border: "1px solid rgba(212,147,26,0.25)",
                          boxShadow: "0 0 12px rgba(212,147,26,0.12), inset 0 1px 0 rgba(255,255,255,0.06)",
                        }
                      : {
                          color: "rgba(148,163,184,0.75)",
                          border: "1px solid transparent",
                        }
                  }
                  onMouseEnter={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLAnchorElement).style.color = "rgba(220,230,242,0.95)";
                      (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.05)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLAnchorElement).style.color = "rgba(148,163,184,0.75)";
                      (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                    }
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 md:gap-3">
            <NetworkSelector />
            <WalletButton />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-5 md:py-8 pb-24 md:pb-8">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
