#!/usr/bin/env node

import { getClient, fmtDate, printTable } from "./client.js";

const usage = `Usage: cycles.js [options]

List cycles.

Options:
  --team <key>       Filter by team key
  --current          Show only current/active cycles
  --limit <n>        Max results (default: 10)

Examples:
  cycles.js --team ENG
  cycles.js --current
  cycles.js --team ENG --current`;

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
  const limit = parseInt(getArg("--limit") || "10");
  const teamKey = getArg("--team");
  const currentOnly = args.includes("--current");

  const filter = {};

  if (teamKey) {
    filter.team = { key: { eq: teamKey.toUpperCase() } };
  }

  if (currentOnly) {
    filter.isActive = { eq: true };
  }

  const cycles = await client.cycles({ first: limit, filter, orderBy: "startsAt" });

  const rows = await Promise.all(
    cycles.nodes.map(async (c) => {
      const team = await c.team;
      return { ...c, _team: team?.key || "—" };
    })
  );

  printTable(rows, [
    { header: "Team", value: (r) => r._team },
    { header: "Name", value: (r) => r.name || `Cycle ${r.number}` },
    { header: "Number", value: (r) => r.number },
    { header: "Start", value: (r) => fmtDate(r.startsAt) },
    { header: "End", value: (r) => fmtDate(r.endsAt) },
    { header: "Progress", value: (r) => `${Math.round((r.progress || 0) * 100)}%` },
    { header: "Active", value: (r) => r.isActive ? "✓" : "" },
  ]);
} catch (e) {
  console.error("✗", e.message);
  process.exit(1);
}
