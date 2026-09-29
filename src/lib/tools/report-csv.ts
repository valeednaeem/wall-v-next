export type CsvCell = string | number | boolean | null | undefined;

function escapeCell(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * RFC-4180 CSV: CRLF line endings, quoted fields containing comma/quote/newline,
 * embedded quotes doubled.
 */
export function toCsv(headers: string[], rows: CsvCell[][]): string {
  const lines = [headers.map(escapeCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCell).join(","));
  }
  return `${lines.join("\r\n")}\r\n`;
}

export const REPORT_TYPES = [
  "usage",
  "adoption",
  "revenue",
  "credits",
  "cost",
  "access",
  "conversion",
  "seo",
  "growth",
  "errors",
  "providers",
  "market",
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_META: Record<ReportType, { title: string; description: string }> = {
  usage: { title: "Usage", description: "Executions, success, views and users per tool" },
  adoption: { title: "Adoption", description: "Daily executions and unique users over time" },
  revenue: { title: "Revenue", description: "Revenue, cost and profit contribution per tool" },
  credits: { title: "Credits", description: "Credits consumed per tool and access model" },
  cost: { title: "Cost", description: "Estimated AI API cost and share per tool" },
  access: { title: "Access models", description: "Activity split by free / freemium / subscription" },
  conversion: { title: "Conversion", description: "Funnel stages and conversion rates per tool" },
  seo: { title: "SEO", description: "Stored SEO completeness per tool (Search Console not connected)" },
  growth: { title: "Growth", description: "Executions: current window vs previous equal window" },
  errors: { title: "Errors", description: "Failure rates and dominant error types per tool" },
  providers: { title: "Providers", description: "Provider usage, success rate and configured pricing" },
  market: { title: "Market research", description: "Manually recorded competitor research entries" },
};
