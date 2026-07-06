import { Link } from "@tanstack/react-router";
import { Home, Users, History, Settings } from "lucide-react";

const tabs = [
  { to: "/", icon: Home, label: "होम" },
  { to: "/khata", icon: Users, label: "किसान" },
  { to: "/history", icon: History, label: "इतिहास" },
  { to: "/settings", icon: Settings, label: "सेटिंग्स" },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-border bg-card pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_-8px_rgba(0,0,0,0.15)]">
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <li key={t.to}>
              <Link
                to={t.to}
                activeOptions={{ exact: t.to === "/" }}
                className="flex flex-col items-center justify-center gap-1 py-3 text-muted-foreground transition-colors data-[status=active]:text-primary data-[status=active]:font-bold"
              >
                <Icon className="h-7 w-7" strokeWidth={2.2} />
                <span className="font-hindi text-xs">{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
