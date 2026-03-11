---
name: linear
description: "Interact with Linear project management — list, search, create, update issues, manage projects, cycles, and teams. Uses the Linear API via @linear/sdk. Requires LINEAR_AGENT_API_KEY environment variable."
---

# Linear Skill

CLI tools for interacting with Linear. All scripts are in `./scripts/` and use the `@linear/sdk` package. Requires `LINEAR_AGENT_API_KEY` env var.

## Setup

Install dependencies (only needed once):

```bash
cd ./scripts && npm install
```

## Current User

```bash
./scripts/me.js
```

Shows your user info, organization, and teams.

## Teams

```bash
./scripts/teams.js
```

## Users

```bash
./scripts/users.js
```

## Workflow States (Statuses)

```bash
./scripts/states.js
./scripts/states.js --team ENG
```

List available statuses per team (e.g. Backlog, Todo, In Progress, Done, Canceled).

## Labels

```bash
./scripts/labels.js
./scripts/labels.js --team ENG
```

## List Issues

```bash
./scripts/issues.js --team ENG
./scripts/issues.js --assignee me --status "In Progress"
./scripts/issues.js --team ENG --cycle current
./scripts/issues.js --label bug --priority 1
./scripts/issues.js --project "API Redesign" --limit 20
./scripts/issues.js --team ENG --json
```

Filters: `--team`, `--assignee me`, `--status`, `--label`, `--priority <0-4>`, `--project`, `--cycle current`, `--limit`, `--json`.

## Get Issue Details

```bash
./scripts/issue-get.js ENG-123
```

Shows full issue details including description, comments, relations, and metadata.

## Search Issues

```bash
./scripts/issue-search.js "login bug"
./scripts/issue-search.js authentication error
```

Full-text search across issue titles, descriptions, and comments.

## Create Issue

```bash
./scripts/issue-create.js --team ENG --title "Fix login bug" --priority 1
./scripts/issue-create.js --team ENG --title "New feature" --description "Details here" --assignee me --label feature
./scripts/issue-create.js --team ENG --title "Sub-task" --parent ENG-100 --status "In Progress"
```

Required: `--team`, `--title`. Optional: `--description`, `--status`, `--priority <0-4>`, `--assignee me|<email>`, `--label <name>` (repeatable), `--estimate`, `--project`, `--parent`, `--due <YYYY-MM-DD>`.

## Update Issue

```bash
./scripts/issue-update.js ENG-123 --status "In Progress"
./scripts/issue-update.js ENG-123 --assignee me --priority 2
./scripts/issue-update.js ENG-123 --status Done
./scripts/issue-update.js ENG-123 --label-add bug --label-rm feature
./scripts/issue-update.js ENG-123 --assignee none
./scripts/issue-update.js ENG-123 --due 2025-03-15
```

Options: `--title`, `--description`, `--status`, `--priority <0-4>`, `--assignee me|<email>|none`, `--label-add`, `--label-rm`, `--estimate`, `--project`, `--parent`, `--due <YYYY-MM-DD>|none`.

## Add Comment

```bash
./scripts/comment.js ENG-123 "This is fixed in the latest deploy"
```

Comments support markdown.

## Projects

```bash
./scripts/projects.js
./scripts/projects.js --status started
./scripts/projects.js --team ENG --json
```

Filters: `--status`, `--team`, `--limit`, `--json`.

## Cycles

```bash
./scripts/cycles.js --team ENG
./scripts/cycles.js --current
```

Filters: `--team`, `--current`, `--limit`.

## Priority Values

| Value | Meaning |
|-------|---------|
| 0     | None    |
| 1     | Urgent  |
| 2     | High    |
| 3     | Medium  |
| 4     | Low     |
