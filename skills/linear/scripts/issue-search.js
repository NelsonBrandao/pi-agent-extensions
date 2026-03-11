#!/usr/bin/env node

import { getClient, truncate, printTable } from "./client.js";

const query = process.argv.slice(2).join(" ");

if (!query) {
  console.log("Usage: issue-search.js <query>");
  console.log("\nSearch issues by text. Searches titles, descriptions, and comments.");
  console.log("\nExamples:");
  console.log('  issue-search.js "login bug"');
  console.log("  issue-search.js authentication error");
  process.exit(1);
}

try {
  const client = getClient();
  const results = await client.searchIssues(query, { first: 25 });

  const rows = await Promise.all(
    results.nodes.map(async (issue) => {
      const state = await issue.state;
      const assignee = await issue.assignee;
      return { ...issue, _state: state?.name || "—", _assignee: assignee?.displayName || "—" };
    })
  );

  printTable(rows, [
    { header: "ID", value: (r) => r.identifier },
    { header: "Status", value: (r) => r._state },
    { header: "Assignee", value: (r) => truncate(r._assignee, 20) },
    { header: "Title", value: (r) => truncate(r.title, 60) },
  ]);

  console.log(`\n${rows.length} result(s)`);
} catch (e) {
  console.error("✗", e.message);
  process.exit(1);
}
