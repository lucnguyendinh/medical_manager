import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";

import { getCurrentUser, userCompaniesInProject } from "@/lib/authz";
import { cloudinaryConfig } from "@/lib/cloudinary";
import { connectToDatabase } from "@/lib/db";
import {
  EXPORT_THUMB_HEIGHT,
  EXPORT_THUMB_WIDTH,
  MAX_EMBEDDED_IMAGES_PER_ROW,
  prefetchExportImages,
  sanitizeExportMedia,
} from "@/lib/medical-export-images";
import { defaultMedicalMonthWeek, resolveMedicalMonthFilter, resolveMedicalWeekFilter } from "@/lib/medical-period";
import { fetchMedicalListAll } from "@/lib/medical-list-query";
import {
  resolveMedicalSortDirection,
  resolveMedicalSortField,
} from "@/lib/medical-list-sort";
import type { MedicalMedia } from "@/lib/medical-media";
import { Project } from "@/models/Project";

/** Full export must not be statically cached (must reflect DB and match list filters). */
export const dynamic = "force-dynamic";

const LAST_COL = "P";
const MEDIA_COL_IDX = 14;
const LINKS_COL_IDX = 15;
const NUMERIC_COL_IDX = new Set([7, 9, 10, 11, 12]);
const WRAP_COL_IDX = new Set([3, 13, LINKS_COL_IDX]);

/* ── Colour palette ── */
const CLR = {
  headerBg: "FF047857",
  headerFg: "FFFFFFFF",
  subHeaderBg: "FFDCFCE7",
  subHeaderFg: "FF14532D",
  altRow: "FFF0FDF4",
  border: "FFB0D4E8",
  totalBg: "FFDCFCE7",
  totalFg: "FF14532D",
};

type ExportRow = {
  ma_nhom: string;
  ma_vtyt_bv: string;
  ten_vtyt_bv: string;
  don_vi_tinh: string;
  ma_hieu: string;
  hang_sx: string;
  don_gia: string;
  company: string;
  dinh_muc: string;
  so_luong: string;
  so_luong_su_dung: string;
  phan_tram: string;
  tstk: string;
  ghi_chu: string;
  media: MedicalMedia[];
};

function applyBorder(cell: ExcelJS.Cell, color = CLR.border) {
  const side: ExcelJS.BorderStyle = "thin";
  cell.border = {
    top: { style: side, color: { argb: color } },
    left: { style: side, color: { argb: color } },
    bottom: { style: side, color: { argb: color } },
    right: { style: side, color: { argb: color } },
  };
}

function styleDataCell(
  cell: ExcelJS.Cell,
  value: ExcelJS.CellValue,
  colIdx: number,
  rowBg: string,
  numFmt?: string,
) {
  cell.value = value;
  cell.font = { size: 10, name: "Arial" };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
  applyBorder(cell);

  if (numFmt && typeof value === "number") {
    cell.numFmt = numFmt;
  }

  if (colIdx === 0) {
    cell.alignment = { horizontal: "center", vertical: "middle" };
  } else if (NUMERIC_COL_IDX.has(colIdx)) {
    cell.alignment = { horizontal: "right", vertical: "middle" };
  } else {
    cell.alignment = {
      horizontal: "left",
      vertical: "middle",
      wrapText: WRAP_COL_IDX.has(colIdx),
    };
  }
}

function setMediaLinksCell(cell: ExcelJS.Cell, media: MedicalMedia[], rowBg: string) {
  if (media.length === 0) {
    styleDataCell(cell, "", LINKS_COL_IDX, rowBg);
    return;
  }

  cell.font = { size: 10, name: "Arial", color: { argb: "FF2563EB" }, underline: true };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
  applyBorder(cell);
  cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };

  if (media.length === 1) {
    cell.value = { text: "Xem ảnh gốc", hyperlink: media[0].url };
    return;
  }

  const lines = media.map((item, index) => `${index + 1}. ${item.url}`);
  if (media.length > MAX_EMBEDDED_IMAGES_PER_ROW) {
    lines.push(`(Chỉ nhúng ${MAX_EMBEDDED_IMAGES_PER_ROW} thumbnail; xem link để mở ảnh gốc)`);
  }
  cell.value = lines.join("\n");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectName: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectName } = await params;
  const decodedProjectName = decodeURIComponent(projectName);

  const { searchParams } = request.nextUrl;
  const periodDefaults = defaultMedicalMonthWeek();
  const month = resolveMedicalMonthFilter(
    searchParams.get("month") ?? undefined,
    periodDefaults.month,
  );
  const week = resolveMedicalWeekFilter(
    searchParams.get("week") ?? undefined,
    periodDefaults.week,
  );
  const companyFilter = (searchParams.get("company") ?? "").trim();
  const q = (searchParams.get("q") ?? "").trim();
  const sortField = resolveMedicalSortField(searchParams.get("sort") ?? undefined);
  const sortDir = resolveMedicalSortDirection(searchParams.get("dir") ?? undefined);

  await connectToDatabase();

  const project = await Project.findOne({ name: decodedProjectName }).lean();
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const userCompanies = userCompaniesInProject(user, decodedProjectName);
  if (!user.isAdmin && userCompanies.length === 0) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!user.isAdmin && companyFilter && !userCompanies.includes(companyFilter)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await fetchMedicalListAll({
    projectName: decodedProjectName,
    user,
    q,
    companyFilter,
    sortField,
    sortDir,
    month,
    week,
  });

  const data: ExportRow[] = rows.map((r) => {
    const pv = r.period_values?.find(
      (p) => Number(p.month) === month && Number(p.week) === week,
    );
    const soLuong = Number(r.so_luong) || 0;
    const soLuongSuDung = Number(pv?.so_luong_su_dung) || 0;
    const phanTram = soLuong > 0 ? ((soLuongSuDung / soLuong) * 100).toFixed(2) : "";

    return {
      ma_nhom: r.ma_nhom ?? "",
      ma_vtyt_bv: r.ma_vtyt_bv ?? "",
      ten_vtyt_bv: r.ten_vtyt_bv ?? "",
      don_vi_tinh: r.don_vi_tinh ?? "",
      ma_hieu: r.ma_hieu ?? "",
      hang_sx: r.hang_sx ?? "",
      don_gia: r.don_gia ?? "",
      company: r.company ?? "",
      dinh_muc: r.dinh_muc ?? "",
      so_luong: r.so_luong ?? "",
      so_luong_su_dung: pv?.so_luong_su_dung ?? "",
      phan_tram: phanTram,
      tstk: pv?.tstk ?? "",
      ghi_chu: pv?.ghi_chu ?? "",
      media: sanitizeExportMedia(
        (r.media ?? []).map((m) => ({
          url: m.url ?? "",
          public_id: m.public_id ?? "",
          width: m.width ?? undefined,
          height: m.height ?? undefined,
          format: m.format ?? undefined,
          bytes: m.bytes ?? undefined,
          uploaded_by: m.uploaded_by ?? undefined,
          uploaded_at: m.uploaded_at ? new Date(m.uploaded_at).toISOString() : undefined,
        })),
        cloudinaryConfig.cloudName,
      ),
    };
  });

  const imageUrls = data.flatMap((row) =>
    row.media.slice(0, MAX_EMBEDDED_IMAGES_PER_ROW).map((item) => item.url),
  );
  const imageCache = await prefetchExportImages(imageUrls);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Medical Management";
  wb.created = new Date();

  const ws = wb.addWorksheet("Báo cáo VTYT", {
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      paperSize: 9,
    },
    views: [{ state: "frozen", xSplit: 0, ySplit: 4 }],
  });

  ws.mergeCells(`A1:${LAST_COL}1`);
  const titleCell = ws.getCell("A1");
  titleCell.value = `BÁO CÁO VẬT TƯ Y TẾ — ${decodedProjectName.toUpperCase()}`;
  titleCell.font = { bold: true, size: 14, color: { argb: CLR.headerFg }, name: "Arial" };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CLR.headerBg } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 32;

  ws.mergeCells(`A2:${LAST_COL}2`);
  const subCell = ws.getCell("A2");
  subCell.value = `Tháng ${month}  —  Tuần ${week}${companyFilter ? `  —  Công ty: ${companyFilter}` : ""}`;
  subCell.font = { bold: false, size: 11, color: { argb: CLR.subHeaderFg }, name: "Arial" };
  subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CLR.subHeaderBg } };
  subCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(2).height = 22;

  ws.getRow(3).height = 6;

  const COLS: { header: string; key: string; width: number; numFmt?: string }[] = [
    { header: "STT", key: "stt", width: 6 },
    { header: "Mã Nhóm", key: "ma_nhom", width: 14 },
    { header: "Mã VTYT-BV", key: "ma_vtyt_bv", width: 16 },
    { header: "Tên Vật Tư Y Tế", key: "ten_vtyt_bv", width: 36 },
    { header: "ĐVT", key: "don_vi_tinh", width: 9 },
    { header: "Mã Hiệu", key: "ma_hieu", width: 16 },
    { header: "Hãng SX", key: "hang_sx", width: 18 },
    { header: "Đơn Giá", key: "don_gia", width: 14, numFmt: "#,##0.00" },
    { header: "Công Ty", key: "company", width: 22 },
    { header: "Định Mức", key: "dinh_muc", width: 12, numFmt: "#,##0.##" },
    { header: "Số Lượng", key: "so_luong", width: 12, numFmt: "#,##0.##" },
    { header: "SL Sử Dụng", key: "so_luong_su_dung", width: 14, numFmt: "#,##0.##" },
    { header: "Tỷ Lệ %", key: "phan_tram", width: 11, numFmt: "0.00" },
    { header: "TSTK / Ghi Chú", key: "tstk", width: 28 },
    { header: "Hình ảnh", key: "media", width: 24 },
    { header: "Link ảnh", key: "media_links", width: 34 },
  ];

  ws.columns = COLS.map((c) => ({ key: c.key, width: c.width }));

  const headerRow = ws.getRow(4);
  headerRow.height = 24;
  COLS.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { bold: true, size: 10, color: { argb: CLR.headerFg }, name: "Arial" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CLR.headerBg } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    applyBorder(cell);
  });

  data.forEach((item, idx) => {
    const rowNum = 5 + idx;
    const row = ws.getRow(rowNum);
    const isAlt = idx % 2 === 1;
    const rowBg = isAlt ? CLR.altRow : "FFFFFFFF";
    const embedCount = Math.min(item.media.length, MAX_EMBEDDED_IMAGES_PER_ROW);
    row.height = embedCount > 0 ? Math.max(48, EXPORT_THUMB_HEIGHT * 0.75 + 8) : 18;

    const values: ExcelJS.CellValue[] = [
      idx + 1,
      item.ma_nhom,
      item.ma_vtyt_bv,
      item.ten_vtyt_bv,
      item.don_vi_tinh,
      item.ma_hieu,
      item.hang_sx,
      item.don_gia !== "" ? Number(item.don_gia) || item.don_gia : "",
      item.company,
      item.dinh_muc !== "" ? Number(item.dinh_muc) || item.dinh_muc : "",
      item.so_luong !== "" ? Number(item.so_luong) || item.so_luong : "",
      item.so_luong_su_dung !== "" ? Number(item.so_luong_su_dung) || item.so_luong_su_dung : "",
      item.phan_tram !== "" ? Number(item.phan_tram) : "",
      [item.tstk, item.ghi_chu].filter(Boolean).join(" | "),
      item.media.length > 0 ? `${item.media.length} ảnh` : "",
      "",
    ];

    values.forEach((val, colIdx) => {
      if (colIdx === LINKS_COL_IDX) {
        return;
      }
      styleDataCell(row.getCell(colIdx + 1), val, colIdx, rowBg, COLS[colIdx].numFmt);
    });

    setMediaLinksCell(row.getCell(LINKS_COL_IDX + 1), item.media, rowBg);

    for (let imageIdx = 0; imageIdx < embedCount; imageIdx += 1) {
      const mediaItem = item.media[imageIdx];
      const asset = imageCache.get(mediaItem.url);
      if (!asset) {
        continue;
      }

      const imageId = wb.addImage({
        buffer: asset.buffer as unknown as ExcelJS.Buffer,
        extension: asset.extension,
      });

      ws.addImage(imageId, {
        tl: {
          col: MEDIA_COL_IDX + imageIdx * 0.95 + 0.05,
          row: rowNum - 1 + 0.08,
        },
        ext: { width: EXPORT_THUMB_WIDTH, height: EXPORT_THUMB_HEIGHT },
        hyperlinks: { hyperlink: mediaItem.url },
        editAs: "oneCell",
      });
    }
  });

  const totalRowNum = 5 + data.length;
  const totalRow = ws.getRow(totalRowNum);
  totalRow.height = 20;

  const totalSoLuong = data.reduce((s, r) => s + (Number(r.so_luong) || 0), 0);
  const totalSuDung = data.reduce((s, r) => s + (Number(r.so_luong_su_dung) || 0), 0);

  const totalValues: (string | number)[] = [
    "",
    "",
    "",
    `Tổng cộng: ${data.length} vật tư`,
    "",
    "",
    "",
    "",
    "",
    "",
    totalSoLuong,
    totalSuDung,
    "",
    "",
    "",
    "",
  ];

  totalValues.forEach((val, colIdx) => {
    const cell = totalRow.getCell(colIdx + 1);
    cell.value = val as ExcelJS.CellValue;
    cell.font = { bold: true, size: 10, color: { argb: CLR.totalFg }, name: "Arial" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CLR.totalBg } };
    applyBorder(cell);
    if ([10, 11].includes(colIdx)) {
      cell.alignment = { horizontal: "right", vertical: "middle" };
      cell.numFmt = "#,##0.##";
    } else if (colIdx === 3) {
      cell.alignment = { horizontal: "left", vertical: "middle" };
    } else {
      cell.alignment = { horizontal: "center", vertical: "middle" };
    }
  });

  const footerRowNum = totalRowNum + 2;
  ws.mergeCells(`A${footerRowNum}:${LAST_COL}${footerRowNum}`);
  const footerCell = ws.getCell(`A${footerRowNum}`);
  footerCell.value = `Xuất lúc: ${new Date().toLocaleString("vi-VN")}  —  Dự án: ${decodedProjectName}`;
  footerCell.font = { italic: true, size: 9, color: { argb: "FF71717A" }, name: "Arial" };
  footerCell.alignment = { horizontal: "right" };

  const fileName = `${decodedProjectName}-thang${month}-tuan${week}.xlsx`;
  const buffer = await wb.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}
