import { Link, useLocation } from "wouter";
import { appKit } from "@/lib/wallet";
import { useAccount } from "wagmi";
import logoUrl from "@assets/IMG_1555_1780933782029.jpg";
import { LayoutDashboard, FolderOpen, FileText, Shield } from "lucide-react";

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

          <div className="flex items-center gap-2 md:gap-4">
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
