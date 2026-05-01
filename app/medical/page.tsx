import { redirect } from "next/navigation";

import { requireUser, userProjects } from "@/lib/authz";

export default async function MedicalPage() {
  const user = await requireUser();
  const fallbackProject = userProjects(user)[0];

  if (!fallbackProject) {
    redirect("/projects");
  }

  redirect(`/projects/${encodeURIComponent(fallbackProject)}/medical`);
}
