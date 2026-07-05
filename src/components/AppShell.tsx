import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

interface Props {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
}

export function AppShell({ title, subtitle, right, children }: Props) {
  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-30 border-b-2 border-border bg-primary text-primary-foreground shadow-md pt-[env(safe-area-inset-top,0px)]">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            <h1 className="font-hindi truncate text-2xl font-black">{title}</h1>
            {subtitle && (
              <p className="font-hindi mt-0.5 truncate text-sm opacity-90">{subtitle}</p>
            )}
          </div>
          {right && <div className="shrink-0">{right}</div>}
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 pt-4">{children}</main>
      <BottomNav />
    </div>
  );
}
