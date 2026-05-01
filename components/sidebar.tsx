"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HeartPulse,
  LayoutGrid,
  Users,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { CurrentUser } from "@/lib/authz";

const STORAGE_KEY = "mm-sidebar-collapsed";

type NavItem = {
  href: string;
  icon: React.ElementType;
  label: string;
};

type SidebarProps = {
  user: CurrentUser;
  mobileOpen: boolean;
  onMobileClose: () => void;
};

export function Sidebar({ user, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "true") setCollapsed(true);
  }, []);

  function toggleCollapse() {
    setCollapsed((prev) => {
      localStorage.setItem(STORAGE_KEY, String(!prev));
      return !prev;
    });
  }

  const navItems: NavItem[] = [
    { href: "/projects", icon: LayoutGrid, label: "Dự án" },
    ...(user.isAdmin
      ? [{ href: "/admin/users", icon: Users, label: "Người dùng" }]
      : []),
  ];

  function isActive(href: string) {
    if (href === "/projects") return pathname.startsWith("/projects") || pathname.startsWith("/medical");
    return pathname.startsWith(href);
  }

  const sidebarContent = (
    <div
      className={cn(
        "flex h-full flex-col border-r border-zinc-200 bg-white transition-all duration-200",
        collapsed ? "w-14" : "w-56",
      )}
    >
      {/* Logo / brand */}
      <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-zinc-100 px-3">
        <Link href="/projects" className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white shadow-sm">
            <HeartPulse size={16} strokeWidth={2.2} />
          </span>
          {!collapsed && (
            <span className="truncate text-sm font-bold text-zinc-900">
              Medical<span className="text-sky-600">Mgmt</span>
            </span>
          )}
        </Link>
        {/* Mobile close button */}
        <button
          type="button"
          onClick={onMobileClose}
          className="ml-auto flex h-7 w-7 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 md:hidden"
          aria-label="Đóng menu"
        >
          <X size={16} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              onClick={onMobileClose}
              className={cn(
                "flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-sky-50 text-sky-700"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
                collapsed && "justify-center",
              )}
            >
              <item.icon
                size={17}
                className={cn("flex-shrink-0", active && "text-sky-600")}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User info at bottom (expanded only) */}
      {!collapsed && (
        <div className="border-t border-zinc-100 px-3 py-3">
          {user.isAdmin ? (
            <span className="mb-1 inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
              Admin
            </span>
          ) : null}
          <p className="truncate text-xs text-zinc-500">{user.gmail}</p>
        </div>
      )}

      {/* Desktop collapse toggle */}
      <button
        type="button"
        onClick={toggleCollapse}
        title={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
        className="hidden h-10 w-full flex-shrink-0 cursor-pointer items-center justify-center border-t border-zinc-100 text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-700 md:flex"
        aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar — always in flow */}
      <aside className="sticky top-0 hidden h-screen flex-shrink-0 md:block">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar — fixed overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 flex md:hidden"
          onClick={onMobileClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm" />
          {/* Panel */}
          <aside
            className="relative flex h-full flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Force expanded on mobile */}
            <div className="flex h-full w-56 flex-col border-r border-zinc-200 bg-white">
              <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-zinc-100 px-3">
                <Link
                  href="/projects"
                  className="flex items-center gap-2.5"
                  onClick={onMobileClose}
                >
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white shadow-sm">
                    <HeartPulse size={16} strokeWidth={2.2} />
                  </span>
                  <span className="text-sm font-bold text-zinc-900">
                    Medical<span className="text-sky-600">Mgmt</span>
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={onMobileClose}
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                >
                  <X size={16} />
                </button>
              </div>

              <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
                {navItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onMobileClose}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium transition",
                        active
                          ? "bg-sky-50 text-sky-700"
                          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
                      )}
                    >
                      <item.icon size={17} className={cn("flex-shrink-0", active && "text-sky-600")} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="border-t border-zinc-100 px-3 py-3">
                {user.isAdmin ? (
                  <span className="mb-1 inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    Admin
                  </span>
                ) : null}
                <p className="truncate text-xs text-zinc-500">{user.gmail}</p>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
