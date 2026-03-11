#!/usr/bin/env node

import { getClient } from "./client.js";

const usage = `Usage: comment.js <identifier> <body>

Add a comment to an issue.

Arguments:
  identifier   Issue identifier (e.g. ENG-123)
  body         Comment body (markdown)

Examples:
  comment.js ENG-123 "This is fixed in the latest deploy"
  comment.js ENG-123 "Investigated this — root cause is in the auth middleware"`;

const identifier = process.argv[2];
const body = process.argv[3];

if (!identifier || !body || process.argv.includes("--help")) {
  console.log(usage);
  process.exit(0);
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

  await client.createComment({ issueId: issue.id, body });
  console.log(`✓ Comment added to ${issue.identifier}`);
} catch (e) {
  console.error("✗", e.message);
  process.exit(1);
}
