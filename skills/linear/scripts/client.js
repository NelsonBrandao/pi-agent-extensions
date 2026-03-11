import { LinearClient } from "@linear/sdk";

export function getClient() {
  const apiKey = process.env.LINEAR_AGENT_API_KEY;
  if (!apiKey) {
    console.error("✗ LINEAR_AGENT_API_KEY environment variable is not set");
    process.exit(1);
  }
  return new LinearClient({ apiKey });
}

/**
 * Format a date string to a readable format
 */
export function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toISOString().slice(0, 10);
}

/**
 * Truncate text to a max length
 */
export function truncate(text, max = 80) {
  if (!text) return "";
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

/**
 * Print items as a simple table
 */
export function printTable(rows, columns) {
  if (rows.length === 0) {
    console.log("No results found.");
    return;
  }

  // Calculate column widths
  const widths = columns.map((col) =>
    Math.max(col.header.length, ...rows.map((r) => String(col.value(r)).length))
  );

  // Header
  const header = columns.map((col, i) => col.header.padEnd(widths[i])).join("  ");
  console.log(header);
  console.log(columns.map((_, i) => "─".repeat(widths[i])).join("  "));

  // Rows
  for (const row of rows) {
    const line = columns.map((col, i) => String(col.value(row)).padEnd(widths[i])).join("  ");
    console.log(line);
  }
}
