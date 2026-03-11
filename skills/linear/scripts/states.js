#!/usr/bin/env node

import { getClient, printTable } from "./client.js";

const usage = `Usage: states.js [--team <key>]

List workflow states (statuses) for a team.

Examples:
  states.js
  states.js --team ENG`;

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
  const teamKey = getArg("--team");

  const filter = {};
  if (teamKey) {
    filter.team = { key: { eq: teamKey.toUpperCase() } };
  }

  const states = await client.workflowStates({ first: 100, filter });

  const rows = await Promise.all(
    states.nodes.map(async (s) => {
      const team = await s.team;
      return { ...s, _team: team?.key || "—" };
    })
  );

  // Sort by team then position
  rows.sort((a, b) => a._team.localeCompare(b._team) || a.position - b.position);

  printTable(rows, [
    { header: "Team", value: (r) => r._team },
    { header: "Name", value: (r) => r.name },
    { header: "Type", value: (r) => r.type },
    { header: "Color", value: (r) => r.color || "—" },
  ]);
} catch (e) {
  console.error("✗", e.message);
  process.exit(1);
}
