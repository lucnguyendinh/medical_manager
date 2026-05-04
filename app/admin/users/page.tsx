import bcrypt from "bcryptjs";
import type { PipelineStage } from "mongoose";
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

const USERS_PAGE_SIZE = 10;

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
  searchParams: Promise<{
    importStatus?: string;
    importMessage?: string;
    q?: string;
    role?: string;
    status?: string;
    page?: string;
  }>;
}) {
  const admin = await requireAdmin();
  const query = await searchParams;

  await connectToDatabase();

  const listQ = (query.q ?? "").trim();
  const listRole = query.role === "admin" || query.role === "user" ? query.role : "";
  const listStatus =
    query.status === "active" || query.status === "inactive" ? query.status : "";
  const listPageRaw = Math.max(1, Number(query.page ?? "1") || 1);

  const userMatch: Record<string, unknown> = {};
  if (listQ) {
    const escaped = listQ.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    userMatch.gmail = new RegExp(escaped, "i");
  }
  if (listRole === "admin") {
    userMatch.isAdmin = true;
  } else if (listRole === "user") {
    userMatch.isAdmin = false;
  }
  if (listStatus === "active") {
    userMatch.is_active = true;
  } else if (listStatus === "inactive") {
    userMatch.is_active = false;
  }

  const usersTotalCount = await User.countDocuments(userMatch);
  const usersTotalPages = Math.max(1, Math.ceil(usersTotalCount / USERS_PAGE_SIZE));
  const usersPage = Math.min(listPageRaw, usersTotalPages);
  const usersSkip = (usersPage - 1) * USERS_PAGE_SIZE;

  const userListPipeline: PipelineStage[] = [{ $match: userMatch as Record<string, unknown> }];
  if (SUPER_ADMIN_GMAIL) {
    userListPipeline.push({
      $addFields: {
        __sortSuper: {
          $cond: [{ $eq: [{ $toLower: "$gmail" }, SUPER_ADMIN_GMAIL] }, 0, 1],
        },
      },
    });
    userListPipeline.push({
      $sort: { __sortSuper: 1, isAdmin: -1, createdAt: -1 },
    });
  } else {
    userListPipeline.push({ $sort: { isAdmin: -1, createdAt: -1 } });
  }
  userListPipeline.push({ $skip: usersSkip }, { $limit: USERS_PAGE_SIZE });
  if (SUPER_ADMIN_GMAIL) {
    userListPipeline.push({ $project: { __sortSuper: 0 } });
  }

  const [users, projectCompanies, projects] = await Promise.all([
    User.aggregate(userListPipeline),
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

      type ParsedRow = {
        gmail: string;
        password: string;
        isAdmin: boolean;
        assignments: { project: string; company: string }[];
      };

      const byGmail = new Map<string, typeof rows>();
      for (const row of rows) {
        const gmail = row.gmail.trim().toLowerCase();
        if (!gmail) {
          throw new Error("Users CSV: gmail is required on every row.");
        }
        if (!byGmail.has(gmail)) {
          byGmail.set(gmail, []);
        }
        byGmail.get(gmail)!.push(row);
      }

      const normalized: ParsedRow[] = [];
      for (const [gmail, groupRows] of byGmail) {
        const passwords = new Set(groupRows.map((r) => r.password.trim()));
        if (passwords.size > 1) {
          throw new Error(`Users CSV: conflicting password values for gmail ${gmail}.`);
        }
        const password = [...passwords][0];
        if (!password) {
          throw new Error(`Users CSV: password is required for gmail ${gmail}.`);
        }

        const adminFlags = new Set(groupRows.map((r) => parseBoolean(r.isadmin ?? "")));
        if (adminFlags.size > 1) {
          throw new Error(`Users CSV: conflicting isadmin values for gmail ${gmail}.`);
        }
        const isAdmin = [...adminFlags][0];

        if (isAdmin) {
          for (const r of groupRows) {
            const project = (r.project ?? "").trim();
            const company = (r.company ?? "").trim();
            if (project || company) {
              throw new Error(
                `Users CSV: admin user ${gmail} must leave project and company empty on all rows.`,
              );
            }
          }
          normalized.push({ gmail, password, isAdmin: true, assignments: [] });
          continue;
        }

        const assignmentKeys = new Set<string>();
        const assignments: { project: string; company: string }[] = [];
        for (const r of groupRows) {
          const project = (r.project ?? "").trim();
          const company = (r.company ?? "").trim();
          if (!project || !company) {
            throw new Error(
              `Users CSV: project and company are required for non-admin gmail ${gmail} (merge multiple rows for multiple assignments).`,
            );
          }
          const key = `${project}::${company}`;
          if (!assignmentKeys.has(key)) {
            assignmentKeys.add(key);
            assignments.push({ project, company });
          }
        }

        normalized.push({ gmail, password, isAdmin: false, assignments });
      }

      const existingUsers = await User.find({ gmail: { $in: normalized.map((row) => row.gmail) } })
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
      title="Quản trị tài khoản"
      description=""
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
          assignments: (user.assignments ?? []).map(
            (a: { project: string; company: string }) => ({
              project: a.project,
              company: a.company,
            }),
          ),
          isAdmin: user.isAdmin,
          isActive: user.is_active,
          isProtected: isProtectedSuperAdmin(user.gmail),
        }))}
        userListQuery={{
          q: listQ,
          role: listRole,
          status: listStatus,
          page: usersPage,
          totalPages: usersTotalPages,
          totalCount: usersTotalCount,
        }}
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
