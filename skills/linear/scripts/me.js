#!/usr/bin/env node

import { getClient } from "./client.js";

try {
  const client = getClient();
  const viewer = await client.viewer;
  const org = await client.organization;
  const teams = await viewer.teams();

  console.log(`User:  ${viewer.displayName} (${viewer.email})`);
  console.log(`ID:    ${viewer.id}`);
  console.log(`Admin: ${viewer.admin ? "yes" : "no"}`);
  console.log(`Org:   ${org.name}`);
  console.log(`Teams: ${teams.nodes.map((t) => `${t.name} [${t.key}]`).join(", ")}`);
} catch (e) {
  console.error("✗", e.message);
  process.exit(1);
}
