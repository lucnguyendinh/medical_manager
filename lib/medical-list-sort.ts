export const MEDICAL_SORT_FIELDS = [
  "ten_vtyt_bv",
  "don_gia",
  "company",
  "so_luong",
  "so_luong_su_dung",
  "phan_tram",
] as const;

export type MedicalSortField = (typeof MEDICAL_SORT_FIELDS)[number];
export type MedicalSortDirection = "asc" | "desc";

export type MedicalListQueryParams = {
  q: string;
  company: string;
  month: number;
  week: number;
  sort: MedicalSortField;
  dir: MedicalSortDirection;
  page?: number;
};

export function resolveMedicalSortField(raw?: string): MedicalSortField {
  if (raw && (MEDICAL_SORT_FIELDS as readonly string[]).includes(raw)) {
    return raw as MedicalSortField;
  }
  return "ten_vtyt_bv";
}

export function resolveMedicalSortDirection(raw?: string): MedicalSortDirection {
  return raw === "desc" ? "desc" : "asc";
}

export function buildMedicalListHref(
  basePath: string,
  params: MedicalListQueryParams,
): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.company) search.set("company", params.company);
  search.set("month", String(params.month));
  search.set("week", String(params.week));
  if (params.sort !== "ten_vtyt_bv") {
    search.set("sort", params.sort);
  }
  if (params.dir !== "asc") {
    search.set("dir", params.dir);
  }
  if (params.page && params.page > 1) {
    search.set("page", String(params.page));
  }
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function buildMedicalSortHref(
  basePath: string,
  params: MedicalListQueryParams,
  field: MedicalSortField,
): string {
  const isActive = params.sort === field;
  const nextDir: MedicalSortDirection =
    isActive && params.dir === "asc" ? "desc" : "asc";

  return buildMedicalListHref(basePath, {
    ...params,
    sort: field,
    dir: nextDir,
    page: 1,
  });
}
