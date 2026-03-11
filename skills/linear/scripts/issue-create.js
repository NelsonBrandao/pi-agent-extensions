#!/usr/bin/env node

import { getClient } from "./client.js";

const usage = `Usage: issue-create.js --team <key> --title <title> [options]

Create a new issue.

Required:
  --team <key>          Team key (e.g. ENG)
  --title <title>       Issue title

Options:
  --description <text>  Issue description (markdown)
  --status <name>       Set initial status
  --priority <0-4>      Priority (0=none, 1=urgent, 2=high, 3=medium, 4=low)
  --assignee me|<email> Assign to yourself or by email
  --label <name>        Add label (can use multiple times)
  --estimate <points>   Set estimate
  --project <name>      Add to project (partial match)
  --parent <id>         Set parent issue (e.g. ENG-100)
  --due <YYYY-MM-DD>    Set due date

Examples:
  issue-create.js --team ENG --title "Fix login bug" --priority 1
  issue-create.js --team ENG --title "New feature" --description "Details here" --assignee me --label feature`;

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h") || args.length === 0) {
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
  const teamKey = getArg("--team");
  const title = getArg("--title");

  if (!teamKey || !title) {
    console.error("✗ --team and --title are required");
    process.exit(1);
  }

  // Resolve team
  const teams = await client.teams({ filter: { key: { eq: teamKey.toUpperCase() } } });
  const team = teams.nodes[0];
  if (!team) {
    console.error("✗ Team not found:", teamKey);
    process.exit(1);
  }

  const input = { teamId: team.id, title };

  // Description
  const desc = getArg("--description");
  if (desc) input.description = desc;

  // Priority
  const priority = getArg("--priority");
  if (priority) input.priority = parseInt(priority);

  // Status
  const statusName = getArg("--status");
  if (statusName) {
    const states = await team.states();
    const state = states.nodes.find(
      (s) => s.name.toLowerCase() === statusName.toLowerCase()
    );
    if (state) {
      input.stateId = state.id;
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
  if (assigneeArg === "me") {
    const viewer = await client.viewer;
    input.assigneeId = viewer.id;
  } else if (assigneeArg) {
    const users = await client.users();
    const user = users.nodes.find(
      (u) => u.email === assigneeArg || u.displayName.toLowerCase() === assigneeArg.toLowerCase()
    );
    if (user) {
      input.assigneeId = user.id;
    } else {
      console.error("✗ User not found:", assigneeArg);
      process.exit(1);
    }
  }

  // Labels
  const labelNames = getAllArgs("--label");
  if (labelNames.length > 0) {
    const allLabels = await client.issueLabels();
    const labelIds = [];
    for (const name of labelNames) {
      const label = allLabels.nodes.find(
        (l) => l.name.toLowerCase() === name.toLowerCase()
      );
      if (label) {
        labelIds.push(label.id);
      } else {
        console.error(`✗ Label "${name}" not found`);
        process.exit(1);
      }
    }
    input.labelIds = labelIds;
  }

  // Estimate
  const estimate = getArg("--estimate");
  if (estimate) input.estimate = parseInt(estimate);

  // Project
  const projectName = getArg("--project");
  if (projectName) {
    const projects = await client.projects({
      filter: { name: { containsIgnoreCase: projectName } },
    });
    if (projects.nodes.length > 0) {
      input.projectId = projects.nodes[0].id;
    } else {
      console.error("✗ Project not found:", projectName);
      process.exit(1);
    }
  }

  // Parent
  const parentId = getArg("--parent");
  if (parentId) {
    if (parentId.includes("-") && !parentId.match(/^[0-9a-f-]{36}$/)) {
      const [pTeamKey, pNum] = parentId.split("-");
      const parentIssues = await client.issues({
        first: 1,
        filter: {
          team: { key: { eq: pTeamKey.toUpperCase() } },
          number: { eq: parseInt(pNum) },
        },
      });
      if (parentIssues.nodes[0]) {
        input.parentId = parentIssues.nodes[0].id;
      } else {
        console.error("✗ Parent issue not found:", parentId);
        process.exit(1);
      }
    } else {
      input.parentId = parentId;
    }
  }

  // Due date
  const due = getArg("--due");
  if (due) input.dueDate = due;

  const result = await client.createIssue(input);
  const issue = await result.issue;

  console.log(`✓ Created ${issue.identifier}: ${issue.title}`);
  console.log(`  URL: ${issue.url}`);
} catch (e) {
  console.error("✗", e.message);
  process.exit(1);
}
