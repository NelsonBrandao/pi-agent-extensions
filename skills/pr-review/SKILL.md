---
name: pr-review
description: "Find the PR for the current branch, check review comments, and address reviewer feedback by making code changes. Uses the `gh` CLI."
---

# PR Review Skill

Address PR review feedback for the current branch.

## Workflow: Address Reviews

When asked to address PR reviews, follow this sequence:

### 1. Get PR context

```bash
gh pr view --json number,title,state,body,reviewDecision,headRefName,baseRefName,statusCheckRollup
```

### 2. Read review comments

All comments with file, line, diff context, and comment ID (needed to reply):

```bash
gh api "repos/{owner}/{repo}/pulls/<number>/comments" --paginate --jq '
  .[] |
  "ID: \(.id)\nFile: \(.path):\(.line // .original_line // "?")\nAuthor: \(.user.login) (\(.created_at | split("T")[0]))\n\(.diff_hunk | split("\n") | .[-3:] | map("  │ \(.)") | join("\n"))\n💬 \(.body)\n"
'
```

To see only unresolved threads, use GraphQL:

```bash
gh api graphql -f query='
  query($owner: String!, $repo: String!, $pr: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $pr) {
        reviewThreads(first: 100) {
          nodes {
            isResolved
            comments(first: 10) {
              nodes {
                author { login }
                body
                path
                line
                createdAt
                databaseId
              }
            }
          }
        }
      }
    }
  }
' -f owner="{owner}" -f repo="{repo}" -F pr=<number>
```

### 3. Check changed files

```bash
gh pr view --json files --jq '.files[] | "\(.status)  +\(.additions) -\(.deletions)  \(.path)"'
```

### 4. Read diff for context

```bash
gh pr diff                        # full diff
gh pr diff | awk '/^diff --git.*<file>/{show=1} /^diff --git/ && !/'"<file>"'/{show=0} show'  # single file
```

### 5. Make the code changes

Read the files mentioned in review comments and address the feedback.

### 6. Reply to comments

```bash
gh api "repos/{owner}/{repo}/pulls/<number>/comments/<comment-id>/replies" -f body="Fixed — <explanation>"
```

### 7. Commit and push

```bash
git add -A && git commit -m "Address review feedback" && git push
```

### 8. Verify CI

```bash
gh pr checks
```

## Top-level review summaries

```bash
gh api "repos/{owner}/{repo}/pulls/<number>/reviews" --jq '.[] | select(.state != "COMMENTED") | "[\(.state)] \(.user.login): \(.body)"'
```
