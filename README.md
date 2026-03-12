# pi agent stuff

A grab bag of skills, extensions, and config for the [pi coding agent](https://github.com/mariozechner/pi-coding-agent).

Some of this is heavily inspired by (or straight up borrowed from) [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff). The rest was built by pi itself — because why not let the agent build its own tools.

## What's in here

- **skills/** — things pi can do (Linear integration, GitHub, etc.)
- **extensions/** — extra capabilities bolted on
- **themes/** — making the TUI less ugly

## Skills

- **linear** — CLI tools for interacting with Linear (list/create/update issues, projects, cycles, etc.). Uses `@linear/sdk`.
- **github** — GitHub via the `gh` CLI.
- **pr-review** — workflow for finding the PR on the current branch, reading review comments, addressing feedback, and replying. All `gh` CLI, no extra dependencies.

## Extensions

- **todos** — file-based todo system that pi can use to track work across sessions. Comes with a `/todos` TUI.
- **review** — `/review` command for code reviews. Can review PRs, uncommitted changes, specific commits, or branches. Inspired by Codex.
- **answer** — extracts questions from pi's responses and gives you a nice TUI to answer them one by one instead of typing everything in a single message.
- **confirm-destructive** — asks "are you sure?" before you accidentally nuke your session.
- **notify** — sends a native terminal notification when pi is done thinking and waiting for you. Supports Ghostty, iTerm2, Kitty, WezTerm, and others.
- **protected-paths** — blocks writes to paths you don't want touched (`.env`, `.git/`, `node_modules/`, etc.).
- **whimsical** — replaces the boring "Thinking..." spinner with random silly messages like "Combobulating..." and "Flibbertigibbeting...".
