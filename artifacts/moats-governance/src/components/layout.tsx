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
        className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-colors"
      >
        <span className="h-2 w-2 rounded-full bg-green-400 shrink-0" />
        <span className="font-mono">
          {address.slice(0, 6)}…{address.slice(-4)}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors whitespace-nowrap"
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur border-t border-border">
      <div className="flex items-center justify-around h-16 safe-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full text-xs font-medium transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-[10px]">{item.label}</span>
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
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur">
        <div className="container mx-auto px-4 h-14 md:h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 md:gap-3 transition-opacity hover:opacity-80">
            <img src={logoUrl} alt="Moats Logo" className="h-7 w-7 md:h-8 md:w-8 rounded-full border border-primary/20 object-cover" />
            <span className="font-bold text-base md:text-lg tracking-tight text-white hidden sm:inline-block">
              Moats <span className="text-primary">Governance</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 bg-background/50 rounded-full px-1 py-1 border border-border">
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-card"
                  }`}
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
