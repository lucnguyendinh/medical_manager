import type { PipelineStage, Types } from "mongoose";

import { Medical, type MedicalDocument } from "@/models/Medical";
import type { MedicalListMatchInput } from "@/lib/medical-list-match";
import { buildMedicalListMatch } from "@/lib/medical-list-match";
import type { MedicalSortDirection, MedicalSortField } from "@/lib/medical-list-sort";

export type MedicalListRow = MedicalDocument & { _id: Types.ObjectId };

type FetchMedicalListPageInput = MedicalListMatchInput & {
  sortField: MedicalSortField;
  sortDir: MedicalSortDirection;
  month: number;
  week: number;
  page: number;
  pageSize: number;
};

function numericFromString(field: string) {
  return {
    $convert: { input: field, to: "double", onError: 0, onNull: 0 },
  };
}

/** Aggregation stages: computed sort keys + $sort (after $match, before pagination). */
export function buildMedicalListSortStages(
  sortField: MedicalSortField,
  sortDir: MedicalSortDirection,
  month: number,
  week: number,
): PipelineStage[] {
  const direction = sortDir === "asc" ? 1 : -1;

  const sortKeyByField: Record<MedicalSortField, string> = {
    ten_vtyt_bv: "_sort_ten_vtyt_bv",
    don_gia: "_sort_don_gia",
    company: "_sort_company",
    so_luong: "_sort_so_luong",
    so_luong_su_dung: "_sort_so_luong_su_dung",
    phan_tram: "_sort_phan_tram",
  };

  return [
    {
      $addFields: {
        _periodEntry: {
          $arrayElemAt: [
            {
              $filter: {
                input: { $ifNull: ["$period_values", []] },
                as: "period",
                cond: {
                  $and: [
                    { $eq: ["$$period.month", month] },
                    { $eq: ["$$period.week", week] },
                  ],
                },
              },
            },
            0,
          ],
        },
      },
    },
    {
      $addFields: {
        _sort_ten_vtyt_bv: { $toLower: { $ifNull: ["$ten_vtyt_bv", ""] } },
        _sort_company: { $toLower: { $ifNull: ["$company", ""] } },
        _sort_don_gia: numericFromString("$don_gia"),
        _sort_so_luong: numericFromString("$so_luong"),
        _sort_so_luong_su_dung: {
          $convert: {
            input: { $ifNull: ["$_periodEntry.so_luong_su_dung", ""] },
            to: "double",
            onError: 0,
            onNull: 0,
          },
        },
      },
    },
    {
      $addFields: {
        _sort_phan_tram: {
          $cond: {
            if: { $gt: ["$_sort_so_luong", 0] },
            then: {
              $multiply: [
                { $divide: ["$_sort_so_luong_su_dung", "$_sort_so_luong"] },
                100,
              ],
            },
            else: -1,
          },
        },
      },
    },
    {
      $sort: {
        [sortKeyByField[sortField]]: direction,
        _sort_ten_vtyt_bv: 1,
        _id: 1,
      },
    },
  ];
}

export async function fetchMedicalListPage({
  projectName,
  user,
  q,
  companyFilter,
  sortField,
  sortDir,
  month,
  week,
  page,
  pageSize,
}: FetchMedicalListPageInput) {
  const matchQuery = buildMedicalListMatch({
    projectName,
    user,
    q,
    companyFilter,
  });

  const pipeline = [
    { $match: matchQuery },
    ...buildMedicalListSortStages(sortField, sortDir, month, week),
    {
      $facet: {
        data: [{ $skip: (page - 1) * pageSize }, { $limit: pageSize }],
        meta: [{ $count: "total" }],
      },
    },
  ];

  const [result] = await Medical.aggregate(pipeline);

  return {
    rows: (result?.data ?? []) as MedicalListRow[],
    totalCount: result?.meta?.[0]?.total ?? 0,
  };
}

export async function fetchMedicalListAll({
  projectName,
  user,
  q,
  companyFilter,
  sortField,
  sortDir,
  month,
  week,
}: Omit<FetchMedicalListPageInput, "page" | "pageSize">): Promise<MedicalListRow[]> {
  const matchQuery = buildMedicalListMatch({
    projectName,
    user,
    q,
    companyFilter,
  });

  return Medical.aggregate([
    { $match: matchQuery },
    ...buildMedicalListSortStages(sortField, sortDir, month, week),
  ]) as Promise<MedicalListRow[]>;
}
