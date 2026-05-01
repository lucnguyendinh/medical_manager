import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { connectToDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/authz";
import { ensureRequiredHeaders, parseBoolean, parseCsvFile } from "@/lib/csv-import";
import { User } from "@/models/User";
import { Project } from "@/models/Project";
import { ProjectCompany } from "@/models/ProjectCompany";
import { UsersTable } from "@/components/admin/users-table";
import { PageShell } from "@/components/page-shell";

const SUPER_ADMIN_GMAIL = process.env.SUPER_ADMIN_GMAIL?.trim().toLowerCase() ?? "";

function isProtectedSuperAdmin(gmail: string) {
  return Boolean(SUPER_ADMIN_GMAIL) && gmail.toLowerCase() === SUPER_ADMIN_GMAIL;
}

/** Parse assignments from indexed FormData fields (assignment_project_N / assignment_company_N). */
function parseAssignments(formData: FormData) {
  const count = Math.min(100, Number(formData.get("assignments_count") ?? 0) || 0);
  const assignments: { project: string; company: string }[] = [];
  for (let i = 0; i < count; i++) {
    const project = String(formData.get(`assignment_project_${i}`) ?? "").trim();
    const company = String(formData.get(`assignment_company_${i}`) ?? "").trim();
    if (project && company) {
      assignments.push({ project, company });
    }
  }
  return assignments;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ importStatus?: string; importMessage?: string }>;
}) {
  const admin = await requireAdmin();
  const query = await searchParams;

  await connectToDatabase();
  const [users, projectCompanies, projects] = await Promise.all([
    User.find().sort({ createdAt: -1 }).lean(),
    ProjectCompany.find().sort({ name: 1 }).lean(),
    Project.find().sort({ name: 1 }).lean(),
  ]);
  const projectNames = projects.map((project) => project.name);

  async function createUserAction(formData: FormData) {
    "use server";
    await requireAdmin();
    await connectToDatabase();

    const gmail = String(formData.get("gmail") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "").trim();
    const isAdmin = formData.get("isAdmin") === "on";

    if (!gmail || !password) return;

    let assignments: { project: string; company: string }[] = [];
    if (!isAdmin) {
      assignments = parseAssignments(formData);
      if (assignments.length === 0) return;

      // Validate every project+company pair exists.
      for (const { project, company } of assignments) {
        const exists = await ProjectCompany.exists({ project, name: company });
        if (!exists) return;
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({
      gmail,
      password: hashedPassword,
      assignments: isAdmin ? [] : assignments,
      isAdmin,
      is_active: true,
    });

    revalidatePath("/admin/users");
  }

  async function updateUserAction(formData: FormData) {
    "use server";
    await requireAdmin();
    await connectToDatabase();

    const userId = String(formData.get("userId") ?? "");
    const targetUser = await User.findById(userId).select("gmail").lean();
    if (!targetUser) return;
    if (isProtectedSuperAdmin(targetUser.gmail)) return;

    const isAdmin = formData.get("isAdmin") === "on";
    let assignments: { project: string; company: string }[] = [];
    if (!isAdmin) {
      assignments = parseAssignments(formData);
    }

    await User.findByIdAndUpdate(userId, {
      isAdmin,
      assignments: isAdmin ? [] : assignments,
    });

    revalidatePath("/admin/users");
  }

  async function toggleUserActiveAction(formData: FormData) {
    "use server";
    await requireAdmin();
    await connectToDatabase();

    const userId = String(formData.get("userId") ?? "");
    const targetUser = await User.findById(userId).select("gmail").lean();
    if (!targetUser) return;
    if (isProtectedSuperAdmin(targetUser.gmail)) return;

    const nextActive = formData.get("nextActive") === "true";
    await User.findByIdAndUpdate(userId, { is_active: nextActive });
    revalidatePath("/admin/users");
  }

  async function deleteUserAction(formData: FormData) {
    "use server";
    await requireAdmin();
    await connectToDatabase();

    const userId = String(formData.get("userId") ?? "");
    const targetUser = await User.findById(userId).select("gmail").lean();
    if (!targetUser || isProtectedSuperAdmin(targetUser.gmail)) return;

    await User.findByIdAndDelete(userId);
    revalidatePath("/admin/users");
  }

  async function importUsersCsvAction(formData: FormData) {
    "use server";
    await requireAdmin();
    await connectToDatabase();

    let importedCount = 0;

    try {
      const rows = await parseCsvFile(formData.get("file"));
      ensureRequiredHeaders(rows, ["gmail", "password", "isadmin", "project", "company"], "Users CSV");
      if (rows.length > 5000) {
        throw new Error("Users CSV exceeds 5000 rows limit.");
      }

      const normalized = rows.map((row, index) => {
        const gmail = row.gmail.trim().toLowerCase();
        const password = row.password.trim();
        const isAdmin = parseBoolean(row.isadmin ?? "");
        const project = (row.project ?? "").trim();
        const company = (row.company ?? "").trim();

        if (!gmail || !password) {
          throw new Error(`Users CSV row ${index + 2}: gmail and password are required.`);
        }
        if (!isAdmin && (!project || !company)) {
          throw new Error(`Users CSV row ${index + 2}: project and company are required for non-admin.`);
        }

        return {
          gmail,
          password,
          isAdmin,
          assignments: isAdmin ? [] : [{ project, company }],
        };
      });

      const gmailSet = new Set<string>();
      for (const row of normalized) {
        if (gmailSet.has(row.gmail)) {
          throw new Error(`Users CSV duplicate gmail in file: ${row.gmail}`);
        }
        gmailSet.add(row.gmail);
      }

      const existingUsers = await User.find({ gmail: { $in: Array.from(gmailSet) } })
        .select("gmail")
        .lean();
      if (existingUsers.length > 0) {
        throw new Error(`Users CSV duplicate with DB: ${existingUsers[0].gmail}`);
      }

      const neededPairs = normalized.flatMap((row) => row.assignments);
      if (neededPairs.length > 0) {
        const pairQueries = neededPairs.map((pair) => ({ project: pair.project, name: pair.company }));
        const existingPairs = await ProjectCompany.find({ $or: pairQueries })
          .select("project name")
          .lean();
        const existingPairSet = new Set(existingPairs.map((item) => `${item.project}::${item.name}`));

        for (const pair of neededPairs) {
          const key = `${pair.project}::${pair.company}`;
          if (!existingPairSet.has(key)) {
            throw new Error(`Users CSV row references unknown company pair: ${key}`);
          }
        }
      }

      const insertPayload = await Promise.all(
        normalized.map(async (row) => ({
          gmail: row.gmail,
          password: await bcrypt.hash(row.password, 10),
          assignments: row.assignments,
          isAdmin: row.isAdmin,
          is_active: true,
        })),
      );

      await User.insertMany(insertPayload, { ordered: true });
      importedCount = insertPayload.length;
      revalidatePath("/admin/users");
    } catch (error) {
      redirect(
        `/admin/users?importStatus=error&importMessage=${encodeURIComponent(
          error instanceof Error ? error.message : "Users CSV import failed.",
        )}`,
      );
    }

    // redirect() must be called outside try/catch — it works via thrown errors internally.
    redirect(
      `/admin/users?importStatus=success&importMessage=${encodeURIComponent(
        `Imported ${importedCount} users successfully.`,
      )}`,
    );
  }

  return (
    <PageShell
      user={admin}
      title="User Management"
      description="Admin can create users and control company/project assignment."
    >
      {query.importMessage ? (
        <section
          className={`rounded-xl border p-3 text-sm ${
            query.importStatus === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {query.importMessage}
        </section>
      ) : null}
      <UsersTable
        users={users.map((user) => ({
          id: user._id.toString(),
          gmail: user.gmail,
          assignments: (user.assignments ?? []).map((a) => ({
            project: a.project,
            company: a.company,
          })),
          isAdmin: user.isAdmin,
          isActive: user.is_active,
          isProtected: isProtectedSuperAdmin(user.gmail),
        }))}
        projects={projectNames}
        projectCompanies={projectCompanies.map((item) => ({
          project: item.project,
          name: item.name,
        }))}
        currentAdminId={admin.id}
        createUserAction={createUserAction}
        updateUserAction={updateUserAction}
        toggleUserActiveAction={toggleUserActiveAction}
        deleteUserAction={deleteUserAction}
        importUsersCsvAction={importUsersCsvAction}
      />
    </PageShell>
  );
}
