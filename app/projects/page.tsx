import { revalidatePath } from "next/cache";

import { requireUser, userProjects } from "@/lib/authz";
import { connectToDatabase } from "@/lib/db";
import { PROJECT_STATUS, Project } from "@/models/Project";
import { PageShell } from "@/components/page-shell";
import { ProjectsTable } from "@/components/projects-table";

export default async function ProjectsPage() {
  const user = await requireUser();
  await connectToDatabase();

  const projects = user.isAdmin
    ? await Project.find().sort({ createdAt: -1 }).lean()
    : await Project.find({
        name: { $in: userProjects(user) },
      })
        .sort({ name: 1 })
        .lean();

  async function createProjectAction(formData: FormData) {
    "use server";
    const actor = await requireUser();
    if (!actor.isAdmin) return;
    await connectToDatabase();

    const name = String(formData.get("name") ?? "").trim();
    const status = String(formData.get("status") ?? "VISIBLE");
    const description = String(formData.get("description") ?? "").trim();
    if (!name) return;

    await Project.create({ name, status, description });
    revalidatePath("/projects");
  }

  async function updateProjectAction(formData: FormData) {
    "use server";
    const actor = await requireUser();
    if (!actor.isAdmin) return;
    await connectToDatabase();

    const projectId = String(formData.get("projectId") ?? "");
    const status = String(formData.get("status") ?? "VISIBLE");
    const description = String(formData.get("description") ?? "").trim();

    // Keep primary key immutable by not updating "name".
    await Project.findByIdAndUpdate(projectId, { status, description });
    revalidatePath("/projects");
  }

  async function deleteProjectAction(formData: FormData) {
    "use server";
    const actor = await requireUser();
    if (!actor.isAdmin) return;
    await connectToDatabase();

    const projectId = String(formData.get("projectId") ?? "");
    await Project.findByIdAndDelete(projectId);
    revalidatePath("/projects");
  }

  return (
    <PageShell
      user={user}
      title="Projects"
      description={
        user.isAdmin
          ? "Manage all projects and company metadata."
          : "Projects assigned to your account."
      }
    >
      <ProjectsTable
        projects={projects.map((project) => ({
          id: project._id.toString(),
          name: project.name,
          status: project.status,
          description: project.description ?? "",
        }))}
        isAdmin={user.isAdmin}
        projectStatuses={PROJECT_STATUS}
        createProjectAction={createProjectAction}
        updateProjectAction={updateProjectAction}
        deleteProjectAction={deleteProjectAction}
      />

    </PageShell>
  );
}
