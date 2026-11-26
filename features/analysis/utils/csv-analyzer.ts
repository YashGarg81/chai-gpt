export interface CsvColumnSummary {
  name: string;
  type: "number" | "string" | "empty";
  missingCount: number;
  min?: number;
  max?: number;
  mean?: number;
  sum?: number;
}

export interface CsvAnalysisResult {
  rowCount: number;
  columnCount: number;
  columns: CsvColumnSummary[];
  truncated: boolean;
}

const MAX_ANALYZED_ROWS = 5_000;

/** Neutralizes spreadsheet formula-injection prefixes (=, +, -, @). */
export function sanitizeCsvCell(value: string): string {
  const trimmed = value.trim();
  if (/^[=+\-@]/.test(trimmed)) {
    return `'${trimmed}`;
  }
  return trimmed;
}

/**
 * Deterministic CSV dataset analyzer.
 * Computes row/column counts, missing values, and numeric statistics
 * without executing any code or relying on model arithmetic.
 */
export function analyzeCsvDataset(csvText: string): CsvAnalysisResult {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { rowCount: 0, columnCount: 0, columns: [], truncated: false };
  }

  const headers = lines[0].split(",").map((h) => sanitizeCsvCell(h));
  const dataLines = lines.slice(1, MAX_ANALYZED_ROWS + 1);
  const truncated = lines.length - 1 > MAX_ANALYZED_ROWS;

  const columns: CsvColumnSummary[] = headers.map((name, colIdx) => {
    let missingCount = 0;
    const nums: number[] = [];
    let hasString = false;

    for (const line of dataLines) {
      const cells = line.split(",");
      const raw = (cells[colIdx] ?? "").trim();
      if (!raw) {
        missingCount++;
        continue;
      }
      const num = Number(raw);
      if (!Number.isNaN(num) && Number.isFinite(num)) {
        nums.push(num);
      } else {
        hasString = true;
      }
    }

    if (nums.length > 0 && !hasString) {
      const sum = nums.reduce((a, b) => a + b, 0);
      return {
        name,
        type: "number",
        missingCount,
        min: Math.min(...nums),
        max: Math.max(...nums),
        mean: Number((sum / nums.length).toFixed(4)),
        sum: Number(sum.toFixed(4)),
      };
    }

    return {
      name,
      type: hasString ? "string" : "empty",
      missingCount,
    };
  });

  return {
    rowCount: dataLines.length,
    columnCount: headers.length,
    columns,
    truncated,
  };
}
