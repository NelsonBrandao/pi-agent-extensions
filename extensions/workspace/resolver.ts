import { resolve } from "node:path";
import { existsSync } from "node:fs";
import type { WorkspaceFolder } from "./config";

/**
 * Resolve a path that may start with @folder/ to an absolute path.
 * Returns the original path if no workspace folder matches.
 */
export function resolveWorkspacePath(
  path: string,
  folders: WorkspaceFolder[],
  cwd: string
): string {
  // Strip leading @ that some models add
  const normalized = path.startsWith("@") ? path.slice(1) : null;
  if (!normalized) return path;

  // Check if it matches any workspace folder: folder/rest or just folder
  for (const folder of folders) {
    const prefix = folder.name + "/";
    if (normalized === folder.name) {
      return folder.absolutePath;
    }
    if (normalized.startsWith(prefix)) {
      const rest = normalized.slice(prefix.length);
      return resolve(folder.absolutePath, rest);
    }
  }

  // No match — return original (with @, built-in tools strip it themselves)
  return path;
}

/**
 * Build the export string to prepend to bash commands.
 * e.g. "export WS_FRONTEND='/abs/path' WS_BACKEND='/abs/path'; "
 */
export function buildBashExports(folders: WorkspaceFolder[]): string {
  if (folders.length === 0) return "";

  const exports = folders
    .filter((f) => f.exists)
    .map((f) => `${f.envVar}='${f.absolutePath.replace(/'/g, "'\\''")}'`)
    .join(" ");

  return exports ? `export ${exports}; ` : "";
}

/** Candidate directories to scan for skills and prompts inside each workspace folder. */
const SKILL_DIRS = [".pi/skills", ".agents/skills"];
const PROMPT_DIRS = [".pi/prompts", ".agents/prompts"];

export interface FolderResources {
  folderName: string;
  skillPaths: string[];
  promptPaths: string[];
}

/**
 * Discover skill and prompt directories inside workspace folders.
 * Returns paths that exist on disk.
 */
export function discoverFolderResources(folders: WorkspaceFolder[]): FolderResources[] {
  const results: FolderResources[] = [];

  for (const folder of folders) {
    if (!folder.exists) continue;

    const skillPaths: string[] = [];
    const promptPaths: string[] = [];

    for (const dir of SKILL_DIRS) {
      const full = resolve(folder.absolutePath, dir);
      if (existsSync(full)) skillPaths.push(full);
    }

    for (const dir of PROMPT_DIRS) {
      const full = resolve(folder.absolutePath, dir);
      if (existsSync(full)) promptPaths.push(full);
    }

    if (skillPaths.length > 0 || promptPaths.length > 0) {
      results.push({ folderName: folder.name, skillPaths, promptPaths });
    }
  }

  return results;
}

/**
 * Build the system prompt section describing workspace folders.
 */
export function buildSystemPromptSection(
  folders: WorkspaceFolder[],
  folderResources?: FolderResources[]
): string {
  if (folders.length === 0) return "";

  const lines = ["", "## Workspace", "", "This session has workspace folders configured. You can access files across multiple projects:", ""];

  for (const folder of folders) {
    const status = folder.exists ? "" : " ⚠️ NOT FOUND";
    lines.push(`  @${folder.name} → ${folder.absolutePath} ($${folder.envVar} in bash)${status}`);
  }

  lines.push("");
  lines.push("- Use `@folder/path` syntax in read, write, and edit tool path parameters");
  lines.push("- Use `$WS_FOLDER` environment variables in bash commands");

  // Document per-folder resources so the LLM knows which skills/prompts belong to which folder
  if (folderResources && folderResources.length > 0) {
    lines.push("");
    lines.push("### Folder-specific skills and prompts");
    lines.push("");
    lines.push("Each workspace folder may have its own skills and prompt templates. When performing tasks that target a specific folder, prefer that folder's skills. When a task spans multiple folders, load and apply each folder's relevant skills independently.");
    lines.push("");
    for (const res of folderResources) {
      const parts: string[] = [];
      if (res.skillPaths.length > 0) parts.push(`skills: ${res.skillPaths.join(", ")}`);
      if (res.promptPaths.length > 0) parts.push(`prompts: ${res.promptPaths.join(", ")}`);
      lines.push(`  @${res.folderName}: ${parts.join("; ")}`);
    }
  }

  lines.push("");

  return lines.join("\n");
}
