type CsvRow = Record<string, string>;

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseCsvMatrix(content: string): string[][] {
  const lines = content
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  return lines.map(parseCsvLine);
}

export async function parseCsvFile(fileValue: FormDataEntryValue | null): Promise<CsvRow[]> {
  if (!(fileValue instanceof File)) {
    throw new Error("CSV file is required.");
  }

  const content = await fileValue.text();
  const matrix = parseCsvMatrix(content);
  if (matrix.length < 2) {
    throw new Error("CSV must contain a header row and at least one data row.");
  }

  const headers = matrix[0].map((header) => header.trim().toLowerCase());
  if (headers.some((header) => !header)) {
    throw new Error("CSV header contains empty columns.");
  }

  const rows: CsvRow[] = [];
  for (let rowIndex = 1; rowIndex < matrix.length; rowIndex += 1) {
    const values = matrix[rowIndex];
    const row: CsvRow = {};

    for (let columnIndex = 0; columnIndex < headers.length; columnIndex += 1) {
      row[headers[columnIndex]] = (values[columnIndex] ?? "").trim();
    }

    rows.push(row);
  }

  return rows;
}

export function ensureRequiredHeaders(
  rows: CsvRow[],
  requiredHeaders: string[],
  fileLabel: string,
) {
  if (rows.length === 0) {
    throw new Error(`${fileLabel} has no data rows.`);
  }

  const firstRowHeaders = new Set(Object.keys(rows[0]));
  const missing = requiredHeaders.filter((header) => !firstRowHeaders.has(header));
  if (missing.length > 0) {
    throw new Error(`${fileLabel} missing required columns: ${missing.join(", ")}`);
  }
}

export function parseBoolean(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}
