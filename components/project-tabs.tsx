import Link from "next/link";
import { LayoutDashboard, Settings, Stethoscope } from "lucide-react";
import type { ReactNode } from "react";

type ProjectTabKey = "dashboard" | "medical" | "settings";

type ProjectTabsProps = {
  projectName: string;
  current: ProjectTabKey;
};

const TAB_STYLES: Record<ProjectTabKey, { label: string; icon: ReactNode; path: string }> = {
  dashboard: {
    label: "Dashboard",
    icon: <LayoutDashboard size={14} />,
    path: "dashboard",
  },
  medical: {
    label: "Vật tư",
    icon: <Stethoscope size={14} />,
    path: "medical",
  },
  settings: {
    label: "Settings",
    icon: <Settings size={14} />,
    path: "settings",
  },
};

export function ProjectTabs({ projectName, current }: ProjectTabsProps) {
  const encodedProjectName = encodeURIComponent(projectName);

  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(TAB_STYLES) as ProjectTabKey[]).map((key) => {
        const tab = TAB_STYLES[key];
        const isActive = key === current;
        return (
          <Link
            key={key}
            href={`/projects/${encodedProjectName}/${tab.path}`}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-emerald-100 text-emerald-700"
                : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            {tab.icon}
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
