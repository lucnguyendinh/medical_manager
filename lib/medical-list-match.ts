import type { CurrentUser } from "@/lib/authz";
import { userCompaniesInProject } from "@/lib/authz";

export type MedicalListMatchInput = {
  projectName: string;
  user: CurrentUser;
  q: string;
  companyFilter: string;
};

/** Same filter as the medical listing (pagination is applied only in the page query, not here). */
export function buildMedicalListMatch({
  projectName,
  user,
  q,
  companyFilter,
}: MedicalListMatchInput): Record<string, unknown> {
  const matchQuery: Record<string, unknown> = {
    is_delete: false,
    project: projectName,
  };

  const userCompanies = userCompaniesInProject(user, projectName);

  if (!user.isAdmin) {
    matchQuery.company = { $in: userCompanies };
  }

  if (q) {
    matchQuery.$or = [
      { ma_vtyt_bv: { $regex: q, $options: "i" } },
      { ten_vtyt_bv: { $regex: q, $options: "i" } },
      { ma_hieu: { $regex: q, $options: "i" } },
    ];
  }

  if (companyFilter) {
    matchQuery.company = companyFilter;
  }

  return matchQuery;
}
