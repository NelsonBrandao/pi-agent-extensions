#!/usr/bin/env node

import { getClient, fmtDate, truncate, printTable } from "./client.js";

const usage = `Usage: issues.js [options]

List issues with optional filters.

Options:
  --team <key>        Filter by team key (e.g. ENG)
  --assignee me       Filter to issues assigned to you
  --status <name>     Filter by status name (e.g. "In Progress", "Todo")
  --label <name>      Filter by label name
  --priority <0-4>    Filter by priority (0=none, 1=urgent, 4=low)
  --project <name>    Filter by project name (partial match)
  --cycle current     Filter to current cycle
  --limit <n>         Max results (default: 50)
  --json              Output raw JSON

Examples:
  issues.js --team ENG --status "In Progress"
  issues.js --assignee me --limit 10
  issues.js --team ENG --cycle current
  issues.js --label bug --priority 1`;

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
  const assignee = getArg("--assignee");
  const statusName = getArg("--status");
  const labelName = getArg("--label");
  const priorityArg = getArg("--priority");
  const projectName = getArg("--project");
  const cycleArg = getArg("--cycle");
  const jsonOutput = args.includes("--json");

  // Build filter
  const filter = {};

  if (teamKey) {
    filter.team = { key: { eq: teamKey.toUpperCase() } };
  }

  if (assignee === "me") {
    const viewer = await client.viewer;
    filter.assignee = { id: { eq: viewer.id } };
  }

  if (statusName) {
    filter.state = { name: { eqCaseInsensitive: statusName } };
  }

  if (labelName) {
    filter.labels = { name: { eqCaseInsensitive: labelName } };
  }

  if (priorityArg) {
    filter.priority = { eq: parseInt(priorityArg) };
  }

  if (projectName) {
    filter.project = { name: { containsIgnoreCase: projectName } };
  }

  if (cycleArg === "current") {
    filter.cycle = { isActive: { eq: true } };
  }

  const issues = await client.issues({
    first: limit,
    filter,
    orderBy: "updatedAt",
  });

  if (jsonOutput) {
    const data = await Promise.all(
      issues.nodes.map(async (issue) => {
        const state = await issue.state;
        const assignee = await issue.assignee;
        const labels = await issue.labels();
        const project = await issue.project;
        return {
          id: issue.id,
          identifier: issue.identifier,
          title: issue.title,
          status: state?.name,
          priority: issue.priority,
          assignee: assignee?.displayName || null,
          labels: labels.nodes.map((l) => l.name),
          project: project?.name || null,
          createdAt: issue.createdAt,
          updatedAt: issue.updatedAt,
          url: issue.url,
        };
      })
    );
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
  }

  // Resolve async fields
  const rows = await Promise.all(
    issues.nodes.map(async (issue) => {
      const state = await issue.state;
      const assignee = await issue.assignee;
      return { ...issue, _state: state?.name || "—", _assignee: assignee?.displayName || "—" };
    })
  );

  printTable(rows, [
    { header: "ID", value: (r) => r.identifier },
    { header: "Status", value: (r) => r._state },
    { header: "Priority", value: (r) => ["None", "Urgent", "High", "Medium", "Low"][r.priority] || r.priority },
    { header: "Assignee", value: (r) => truncate(r._assignee, 20) },
    { header: "Title", value: (r) => truncate(r.title, 60) },
  ]);

  console.log(`\n${rows.length} issue(s) shown`);
} catch (e) {
  console.error("✗", e.message);
  process.exit(1);
}
