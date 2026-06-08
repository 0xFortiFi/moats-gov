import { Link, useLocation } from "wouter";
import { appKit } from "@/lib/wallet";
import { useAccount } from "wagmi";
import logoUrl from "@assets/IMG_1555_1780933782029.jpg";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard" },
    { href: "/projects", label: "Projects" },
    { href: "/proposals", label: "Proposals" },
    { href: "/admin", label: "Admin" },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground dark">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <img src={logoUrl} alt="Moats Logo" className="h-8 w-8 rounded-full border border-primary/20 object-cover" />
            <span className="font-bold text-lg tracking-tight text-white hidden sm:inline-block">
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

          <div className="flex items-center gap-4">
            <appkit-button />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
