"use client";

import { useState, type ReactNode } from "react";

import { AppHeader } from "@/components/app-header";
import { Sidebar } from "@/components/sidebar";
import type { CurrentUser } from "@/lib/authz";

type PageShellProps = {
  user: CurrentUser;
  title: string;
  description: string;
  children: ReactNode;
  action?: ReactNode;
};

export function PageShell({ user, title, description, children, action }: PageShellProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar
        user={user}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader user={user} onMenuClick={() => setMobileSidebarOpen(true)} />

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-8">
          <div className="mx-auto w-full max-w-7xl space-y-5">
            {/* Page header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-zinc-900 md:text-2xl">{title}</h1>
                <p className="mt-1 text-sm text-zinc-500">{description}</p>
              </div>
              {action ? <div className="flex-shrink-0">{action}</div> : null}
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
