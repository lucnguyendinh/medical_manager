"use client";

import { Menu, LogOut } from "lucide-react";

import { signOutAction } from "@/lib/auth-actions";
import type { CurrentUser } from "@/lib/authz";

type AppHeaderProps = {
  user: CurrentUser;
  onMenuClick: () => void;
};

export function AppHeader({ user, onMenuClick }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-zinc-200/80 bg-white/95 px-4 backdrop-blur-sm">
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 md:hidden"
        aria-label="Mở menu"
      >
        <Menu size={18} />
      </button>

      {/* Spacer for desktop (sidebar takes the left space) */}
      <div className="hidden md:block" />

      {/* Right: user info + logout */}
      <div className="flex items-center gap-2">
        {user.isAdmin ? (
          <span className="hidden rounded-md bg-indigo-50 px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wide text-indigo-600 sm:inline-flex">
            Admin
          </span>
        ) : null}
        <span className="max-w-44 truncate rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
          {user.gmail}
        </span>
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex cursor-pointer items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-800"
          >
            <LogOut size={12} />
            <span className="hidden sm:inline">Đăng xuất</span>
          </button>
        </form>
      </div>
    </header>
  );
}
