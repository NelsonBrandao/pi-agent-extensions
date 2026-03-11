#!/usr/bin/env node

import { getClient, fmtDate, truncate, printTable } from "./client.js";

const usage = `Usage: projects.js [options]

List projects.

Options:
  --status <name>    Filter by status (e.g. "started", "planned", "completed", "backlog", "paused", "canceled")
  --team <key>       Filter to projects accessible by team
  --limit <n>        Max results (default: 50)
  --json             Output raw JSON

Examples:
  projects.js
  projects.js --status started
  projects.js --limit 10`;

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(usage);
  process.exit(0);
}

function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
}

try {
  const client = getClient();
  const limit = parseInt(getArg("--limit") || "50");
  const teamKey = getArg("--team");
  const jsonOutput = args.includes("--json");

  const filter = {};

  const statusArg = getArg("--status");
  if (statusArg) {
    filter.status = { name: { eqCaseInsensitive: statusArg } };
  }

  if (teamKey) {
    filter.accessibleTeams = { key: { eq: teamKey.toUpperCase() } };
  }

  const projects = await client.projects({ first: limit, filter, orderBy: "updatedAt" });

  if (jsonOutput) {
    const data = await Promise.all(
      projects.nodes.map(async (p) => {
        const lead = await p.lead;
        const status = await p.status;
        return {
          id: p.id,
          name: p.name,
          status: status?.name || "—",
          lead: lead?.displayName || null,
          progress: p.progress,
          targetDate: p.targetDate,
          startDate: p.startDate,
          url: p.url,
        };
      })
    );
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
  }

  const rows = await Promise.all(
    projects.nodes.map(async (p) => {
      const lead = await p.lead;
      const status = await p.status;
      return { ...p, _lead: lead?.displayName || "—", _status: status?.name || "—" };
    })
  );

  printTable(rows, [
    { header: "Name", value: (r) => truncate(r.name, 40) },
    { header: "Status", value: (r) => r._status },
    { header: "Progress", value: (r) => `${Math.round((r.progress || 0) * 100)}%` },
    { header: "Lead", value: (r) => truncate(r._lead, 20) },
    { header: "Target", value: (r) => r.targetDate || "—" },
  ]);

  console.log(`\n${rows.length} project(s)`);
} catch (e) {
  console.error("✗", e.message);
  process.exit(1);
}
