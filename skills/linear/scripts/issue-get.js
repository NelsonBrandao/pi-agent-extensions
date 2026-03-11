#!/usr/bin/env node

import { getClient, fmtDate } from "./client.js";

const identifier = process.argv[2];

if (!identifier) {
  console.log("Usage: issue-get.js <identifier>");
  console.log("\nExamples:");
  console.log("  issue-get.js ENG-123");
  console.log("  issue-get.js <uuid>");
  process.exit(1);
}

try {
  const client = getClient();

  let issue;
  if (identifier.includes("-") && !identifier.match(/^[0-9a-f-]{36}$/)) {
    // It's a team identifier like ENG-123
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

  const state = await issue.state;
  const assignee = await issue.assignee;
  const creator = await issue.creator;
  const project = await issue.project;
  const labels = await issue.labels();
  const parent = await issue.parent;
  const comments = await issue.comments({ first: 10, orderBy: "createdAt" });
  const relations = await issue.relations();

  console.log(`${issue.identifier}: ${issue.title}`);
  console.log(`${"─".repeat(60)}`);
  console.log(`Status:      ${state?.name || "—"}`);
  console.log(`Priority:    ${["None", "Urgent", "High", "Medium", "Low"][issue.priority] || issue.priority}`);
  console.log(`Assignee:    ${assignee?.displayName || "Unassigned"}`);
  console.log(`Creator:     ${creator?.displayName || "—"}`);
  console.log(`Labels:      ${labels.nodes.map((l) => l.name).join(", ") || "—"}`);
  console.log(`Project:     ${project?.name || "—"}`);
  if (parent) {
    console.log(`Parent:      ${parent.identifier} — ${parent.title}`);
  }
  console.log(`Created:     ${fmtDate(issue.createdAt)}`);
  console.log(`Updated:     ${fmtDate(issue.updatedAt)}`);
  if (issue.dueDate) {
    console.log(`Due:         ${issue.dueDate}`);
  }
  if (issue.estimate) {
    console.log(`Estimate:    ${issue.estimate}`);
  }
  console.log(`URL:         ${issue.url}`);

  if (relations.nodes.length > 0) {
    console.log(`\nRelations:`);
    for (const rel of relations.nodes) {
      const related = await rel.relatedIssue;
      console.log(`  ${rel.type}: ${related.identifier} — ${related.title}`);
    }
  }

  if (issue.description) {
    console.log(`\nDescription:\n${issue.description}`);
  }

  if (comments.nodes.length > 0) {
    console.log(`\nComments (${comments.nodes.length}):`);
    for (const comment of comments.nodes) {
      const author = await comment.user;
      console.log(`\n  [${fmtDate(comment.createdAt)}] ${author?.displayName || "Unknown"}:`);
      const body = comment.body || "";
      for (const line of body.split("\n")) {
        console.log(`    ${line}`);
      }
    }
  }
} catch (e) {
  console.error("✗", e.message);
  process.exit(1);
}
