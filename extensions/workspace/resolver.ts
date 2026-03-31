import { resolve } from "node:path";
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

/**
 * Build the system prompt section describing workspace folders.
 */
export function buildSystemPromptSection(folders: WorkspaceFolder[]): string {
  if (folders.length === 0) return "";

  const lines = ["", "## Workspace", "", "This session has workspace folders configured. You can access files across multiple projects:", ""];

  for (const folder of folders) {
    const status = folder.exists ? "" : " ⚠️ NOT FOUND";
    lines.push(`  @${folder.name} → ${folder.absolutePath} ($${folder.envVar} in bash)${status}`);
  }

  lines.push("");
  lines.push("- Use `@folder/path` syntax in read, write, and edit tool path parameters");
  lines.push("- Use `$WS_FOLDER` environment variables in bash commands");
  lines.push("");

  return lines.join("\n");
}
