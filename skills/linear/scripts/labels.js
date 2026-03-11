#!/usr/bin/env node

import { getClient, printTable } from "./client.js";

const usage = `Usage: labels.js [--team <key>]

List available issue labels.

Examples:
  labels.js
  labels.js --team ENG`;

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

  const labels = await client.issueLabels({ first: 100, filter });

  printTable(labels.nodes, [
    { header: "Name", value: (l) => l.name },
    { header: "Color", value: (l) => l.color || "—" },
    { header: "ID", value: (l) => l.id },
  ]);
} catch (e) {
  console.error("✗", e.message);
  process.exit(1);
}
