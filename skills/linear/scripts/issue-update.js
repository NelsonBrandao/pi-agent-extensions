#!/usr/bin/env node

import { getClient } from "./client.js";

const usage = `Usage: issue-update.js <identifier> [options]

Update an existing issue.

Options:
  --title <title>       Update title
  --description <text>  Update description (markdown)
  --status <name>       Change status (e.g. "In Progress", "Done")
  --priority <0-4>      Change priority (0=none, 1=urgent, 2=high, 3=medium, 4=low)
  --assignee me|<email> Reassign (use "none" to unassign)
  --label-add <name>    Add a label
  --label-rm <name>     Remove a label
  --estimate <points>   Set estimate
  --project <name>      Move to project (use "none" to remove)
  --parent <id>         Set parent issue (use "none" to remove)
  --due <YYYY-MM-DD>    Set due date (use "none" to clear)

Examples:
  issue-update.js ENG-123 --status "In Progress"
  issue-update.js ENG-123 --assignee me --priority 2
  issue-update.js ENG-123 --status Done
  issue-update.js ENG-123 --label-add bug --label-rm feature`;

const args = process.argv.slice(2);
const identifier = args[0];

if (!identifier || args.includes("--help") || args.includes("-h")) {
  console.log(usage);
  process.exit(0);
}

function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
}

function getAllArgs(flag) {
  const values = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === flag && i + 1 < args.length) {
      values.push(args[i + 1]);
    }
  }
  return values;
}

try {
  const client = getClient();

  // Resolve issue
  let issue;
  if (identifier.includes("-") && !identifier.match(/^[0-9a-f-]{36}$/)) {
    const [teamKey, num] = identifier.split("-");
    const issues = await client.issues({
      first: 1,
      filter: {
        team: { key: { eq: teamKey.toUpperCase() } },
        number: { eq: parseInt(num) },
      },
    });
    issue = issues.nodes[0];
  } else {
    issue = await client.issue(identifier);
  }

  if (!issue) {
    console.error("✗ Issue not found:", identifier);
    process.exit(1);
  }

  const update = {};

  // Title
  const title = getArg("--title");
  if (title) update.title = title;

  // Description
  const desc = getArg("--description");
  if (desc) update.description = desc;

  // Priority
  const priority = getArg("--priority");
  if (priority) update.priority = parseInt(priority);

  // Status
  const statusName = getArg("--status");
  if (statusName) {
    const team = await issue.team;
    const states = await team.states();
    const state = states.nodes.find(
      (s) => s.name.toLowerCase() === statusName.toLowerCase()
    );
    if (state) {
      update.stateId = state.id;
    } else {
      console.error(
        `✗ Status "${statusName}" not found. Available:`,
        states.nodes.map((s) => s.name).join(", ")
      );
      process.exit(1);
    }
  }

  // Assignee
  const assigneeArg = getArg("--assignee");
  if (assigneeArg === "none") {
    update.assigneeId = null;
  } else if (assigneeArg === "me") {
    const viewer = await client.viewer;
    update.assigneeId = viewer.id;
  } else if (assigneeArg) {
    const users = await client.users();
    const user = users.nodes.find(
      (u) => u.email === assigneeArg || u.displayName.toLowerCase() === assigneeArg.toLowerCase()
    );
    if (user) {
      update.assigneeId = user.id;
    } else {
      console.error("✗ User not found:", assigneeArg);
      process.exit(1);
    }
  }

  // Labels add/remove
  const labelsAdd = getAllArgs("--label-add");
  const labelsRm = getAllArgs("--label-rm");
  if (labelsAdd.length > 0 || labelsRm.length > 0) {
    const currentLabels = await issue.labels();
    const allLabels = await client.issueLabels();
    let labelIds = currentLabels.nodes.map((l) => l.id);

    for (const name of labelsAdd) {
      const label = allLabels.nodes.find(
        (l) => l.name.toLowerCase() === name.toLowerCase()
      );
      if (!label) {
        console.error(`✗ Label "${name}" not found`);
        process.exit(1);
      }
      if (!labelIds.includes(label.id)) labelIds.push(label.id);
    }

    for (const name of labelsRm) {
      const label = allLabels.nodes.find(
        (l) => l.name.toLowerCase() === name.toLowerCase()
      );
      if (label) {
        labelIds = labelIds.filter((id) => id !== label.id);
      }
    }

    update.labelIds = labelIds;
  }

  // Estimate
  const estimate = getArg("--estimate");
  if (estimate) update.estimate = parseInt(estimate);

  // Project
  const projectName = getArg("--project");
  if (projectName === "none") {
    update.projectId = null;
  } else if (projectName) {
    const projects = await client.projects({
      filter: { name: { containsIgnoreCase: projectName } },
    });
    if (projects.nodes.length > 0) {
      update.projectId = projects.nodes[0].id;
    } else {
      console.error("✗ Project not found:", projectName);
      process.exit(1);
    }
  }

  // Parent
  const parentArg = getArg("--parent");
  if (parentArg === "none") {
    update.parentId = null;
  } else if (parentArg) {
    if (parentArg.includes("-") && !parentArg.match(/^[0-9a-f-]{36}$/)) {
      const [pTeamKey, pNum] = parentArg.split("-");
      const parentIssues = await client.issues({
        first: 1,
        filter: {
          team: { key: { eq: pTeamKey.toUpperCase() } },
          number: { eq: parseInt(pNum) },
        },
      });
      if (parentIssues.nodes[0]) {
        update.parentId = parentIssues.nodes[0].id;
      } else {
        console.error("✗ Parent issue not found:", parentArg);
        process.exit(1);
      }
    } else {
      update.parentId = parentArg;
    }
  }

  // Due date
  const due = getArg("--due");
  if (due === "none") {
    update.dueDate = null;
  } else if (due) {
    update.dueDate = due;
  }

  if (Object.keys(update).length === 0) {
    console.log("Nothing to update. Use --help for options.");
    process.exit(0);
  }

  await client.updateIssue(issue.id, update);
  console.log(`✓ Updated ${issue.identifier}`);

  // Show what was changed
  for (const [key, value] of Object.entries(update)) {
    if (key === "stateId") {
      console.log(`  status → ${statusName}`);
    } else if (key === "assigneeId") {
      console.log(`  assignee → ${value === null ? "unassigned" : assigneeArg}`);
    } else if (key === "labelIds") {
      if (labelsAdd.length) console.log(`  labels added: ${labelsAdd.join(", ")}`);
      if (labelsRm.length) console.log(`  labels removed: ${labelsRm.join(", ")}`);
    } else if (key === "projectId") {
      console.log(`  project → ${value === null ? "removed" : projectName}`);
    } else if (key === "parentId") {
      console.log(`  parent → ${value === null ? "removed" : parentArg}`);
    } else if (key === "dueDate") {
      console.log(`  due → ${value === null ? "cleared" : value}`);
    } else {
      console.log(`  ${key} → ${value}`);
    }
  }
} catch (e) {
  console.error("✗", e.message);
  process.exit(1);
}
