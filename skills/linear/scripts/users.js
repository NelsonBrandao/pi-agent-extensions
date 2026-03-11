#!/usr/bin/env node

import { getClient, printTable } from "./client.js";

try {
  const client = getClient();
  const users = await client.users();

  printTable(users.nodes, [
    { header: "Name", value: (u) => u.displayName },
    { header: "Email", value: (u) => u.email || "—" },
    { header: "Active", value: (u) => u.active ? "✓" : "✗" },
    { header: "Admin", value: (u) => u.admin ? "✓" : "" },
    { header: "ID", value: (u) => u.id },
  ]);
} catch (e) {
  console.error("✗", e.message);
  process.exit(1);
}
