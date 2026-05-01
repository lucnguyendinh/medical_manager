import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";

export type UserAssignment = {
  project: string;
  company: string;
};

export type CurrentUser = {
  id: string;
  gmail: string;
  isAdmin: boolean;
  is_active: boolean;
  assignments: UserAssignment[];
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  await connectToDatabase();
  const dbUser = await User.findById(session.user.id).lean();
  if (!dbUser || !dbUser.is_active) {
    return null;
  }

  return {
    id: dbUser._id.toString(),
    gmail: dbUser.gmail,
    isAdmin: dbUser.isAdmin,
    is_active: dbUser.is_active,
    assignments: (dbUser.assignments ?? []).map((a) => ({
      project: a.project,
      company: a.company,
    })),
  };
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.isAdmin) {
    redirect("/medical");
  }

  return user;
}

export function canManageMedicalRecord(
  user: CurrentUser,
  company: string,
  project: string,
): boolean {
  if (user.isAdmin) {
    return true;
  }

  return user.assignments.some((a) => a.project === project && a.company === company);
}

/** Returns unique project names the user is assigned to. */
export function userProjects(user: CurrentUser): string[] {
  return [...new Set(user.assignments.map((a) => a.project))];
}

/** Returns company names for the user in a specific project. */
export function userCompaniesInProject(user: CurrentUser, project: string): string[] {
  return user.assignments.filter((a) => a.project === project).map((a) => a.company);
}
