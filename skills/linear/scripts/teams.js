#!/usr/bin/env node

import { getClient, printTable } from "./client.js";

try {
  const client = getClient();
  const teams = await client.teams();

  printTable(teams.nodes, [
    { header: "Key", value: (t) => t.key },
    { header: "Name", value: (t) => t.name },
    { header: "ID", value: (t) => t.id },
    { header: "Members", value: (t) => t.memberCount ?? "—" },
  ]);
} catch (e) {
  console.error("✗", e.message);
  process.exit(1);
}
