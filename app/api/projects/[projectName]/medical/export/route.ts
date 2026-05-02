import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";

import { requireAdmin } from "@/lib/authz";
import { connectToDatabase } from "@/lib/db";
import { Medical } from "@/models/Medical";
import { Project } from "@/models/Project";

/* ── Colour palette ── */
const CLR = {
  headerBg: "FF0369A1",    // sky-700
  headerFg: "FFFFFFFF",
  subHeaderBg: "FFE0F2FE", // sky-100
  subHeaderFg: "FF0C4A6E", // sky-950
  altRow: "FFF0F9FF",      // sky-50
  border: "FFB0D4E8",
  totalBg: "FFDBEAFE",     // indigo-100
  totalFg: "FF1E1B4B",     // indigo-950
  accent: "FF0EA5E9",      // sky-500
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectName: string }> },
) {
  // Admin only
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectName } = await params;
  const decodedProjectName = decodeURIComponent(projectName);

  const { searchParams } = request.nextUrl;
  const month = Math.min(12, Math.max(1, Number(searchParams.get("month") ?? "1") || 1));
  const week = Math.min(4, Math.max(1, Number(searchParams.get("week") ?? "1") || 1));
  const companyFilter = (searchParams.get("company") ?? "").trim();
  const q = (searchParams.get("q") ?? "").trim();

  await connectToDatabase();

  const project = await Project.findOne({ name: decodedProjectName }).lean();
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const matchQuery: Record<string, unknown> = {
    project: decodedProjectName,
    is_delete: false,
  };
  if (companyFilter) matchQuery.company = companyFilter;
  if (q) {
    matchQuery.$or = [
      { ma_vtyt_bv: { $regex: q, $options: "i" } },
      { ten_vtyt_bv: { $regex: q, $options: "i" } },
      { ma_hieu: { $regex: q, $options: "i" } },
    ];
  }

  const rows = await Medical.find(matchQuery).sort({ company: 1, ma_nhom: 1, ten_vtyt_bv: 1 }).lean();

  // Resolve period value for each row
  const data = rows.map((r) => {
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
    };
  });

  /* ── Build workbook ── */
  const wb = new ExcelJS.Workbook();
  wb.creator = "Medical Management";
  wb.created = new Date();

  const ws = wb.addWorksheet("Báo cáo VTYT", {
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      paperSize: 9, // A4
    },
    views: [{ state: "frozen", xSplit: 0, ySplit: 4 }],
  });

  /* ── Title row ── */
  ws.mergeCells("A1:N1");
  const titleCell = ws.getCell("A1");
  titleCell.value = `BÁO CÁO VẬT TƯ Y TẾ — ${decodedProjectName.toUpperCase()}`;
  titleCell.font = { bold: true, size: 14, color: { argb: CLR.headerFg }, name: "Arial" };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CLR.headerBg } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 32;

  /* ── Subtitle row ── */
  ws.mergeCells("A2:N2");
  const subCell = ws.getCell("A2");
  subCell.value = `Tháng ${month}  —  Tuần ${week}${companyFilter ? `  —  Công ty: ${companyFilter}` : ""}`;
  subCell.font = { bold: false, size: 11, color: { argb: CLR.subHeaderFg }, name: "Arial" };
  subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CLR.subHeaderBg } };
  subCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(2).height = 22;

  /* ── Empty separator ── */
  ws.getRow(3).height = 6;

  /* ── Column headers ── */
  const COLS: { header: string; key: string; width: number; numFmt?: string }[] = [
    { header: "STT",              key: "stt",             width: 6  },
    { header: "Mã Nhóm",          key: "ma_nhom",         width: 14 },
    { header: "Mã VTYT-BV",       key: "ma_vtyt_bv",      width: 16 },
    { header: "Tên Vật Tư Y Tế",  key: "ten_vtyt_bv",     width: 36 },
    { header: "ĐVT",              key: "don_vi_tinh",     width: 9  },
    { header: "Mã Hiệu",          key: "ma_hieu",         width: 16 },
    { header: "Hãng SX",          key: "hang_sx",         width: 18 },
    { header: "Đơn Giá",          key: "don_gia",         width: 14, numFmt: "#,##0.00" },
    { header: "Công Ty",          key: "company",         width: 22 },
    { header: "Định Mức",         key: "dinh_muc",        width: 12, numFmt: "#,##0.##" },
    { header: "Số Lượng",         key: "so_luong",        width: 12, numFmt: "#,##0.##" },
    { header: "SL Sử Dụng",       key: "so_luong_su_dung",width: 14, numFmt: "#,##0.##" },
    { header: "Tỷ Lệ %",          key: "phan_tram",       width: 11, numFmt: "0.00" },
    { header: "TSTK / Ghi Chú",   key: "tstk",            width: 28 },
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

  /* ── Data rows ── */
  data.forEach((item, idx) => {
    const rowNum = 5 + idx;
    const row = ws.getRow(rowNum);
    row.height = 18;

    const isAlt = idx % 2 === 1;
    const rowBg = isAlt ? CLR.altRow : "FFFFFFFF";

    const values = [
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
    ];

    values.forEach((val, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = val as ExcelJS.CellValue;
      cell.font = { size: 10, name: "Arial" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
      applyBorder(cell);

      // Number format
      const numFmt = COLS[colIdx].numFmt;
      if (numFmt && typeof val === "number") cell.numFmt = numFmt;

      // Alignment
      if (colIdx === 0) cell.alignment = { horizontal: "center", vertical: "middle" };
      else if ([7, 9, 10, 11, 12].includes(colIdx))
        cell.alignment = { horizontal: "right", vertical: "middle" };
      else cell.alignment = { horizontal: "left", vertical: "middle", wrapText: colIdx === 3 || colIdx === 13 };
    });
  });

  /* ── Totals row ── */
  const totalRowNum = 5 + data.length;
  const totalRow = ws.getRow(totalRowNum);
  totalRow.height = 20;

  const totalSoLuong = data.reduce((s, r) => s + (Number(r.so_luong) || 0), 0);
  const totalSuDung  = data.reduce((s, r) => s + (Number(r.so_luong_su_dung) || 0), 0);

  const totalValues: (string | number)[] = [
    "", "", "", `Tổng cộng: ${data.length} vật tư`, "", "", "", "", "",
    "", totalSoLuong, totalSuDung, "", "",
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

  /* ── Footer note ── */
  const footerRowNum = totalRowNum + 2;
  ws.mergeCells(`A${footerRowNum}:N${footerRowNum}`);
  const footerCell = ws.getCell(`A${footerRowNum}`);
  footerCell.value = `Xuất lúc: ${new Date().toLocaleString("vi-VN")}  —  Dự án: ${decodedProjectName}`;
  footerCell.font = { italic: true, size: 9, color: { argb: "FF71717A" }, name: "Arial" };
  footerCell.alignment = { horizontal: "right" };

  /* ── Output ── */
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
