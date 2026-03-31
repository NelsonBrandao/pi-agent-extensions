import { readFileSync, existsSync, accessSync } from "node:fs";
import { resolve, basename } from "node:path";

export interface WorkspaceFolder {
  /** Original path from config (relative or absolute) */
  rawPath: string;
  /** Resolved absolute path */
  absolutePath: string;
  /** Display name / alias */
  name: string;
  /** Environment variable name (WS_FOLDER_NAME) */
  envVar: string;
  /** Whether the folder exists on disk */
  exists: boolean;
}

export interface WorkspaceConfig {
  folders: WorkspaceFolder[];
}

interface RawFolderEntry {
  path: string;
  name?: string;
}

interface RawConfig {
  folders?: RawFolderEntry[];
}

/**
 * Derive an env var name from a folder name.
 * Uppercase, replace non-alphanumeric with underscore, prefix with WS_.
 * e.g. "my-frontend" → "WS_MY_FRONTEND"
 */
export function toEnvVarName(name: string): string {
  return "WS_" + name.toUpperCase().replace(/[^A-Z0-9]/g, "_");
}

/**
 * Load and parse .pi/workspace.json from the given working directory.
 * Returns null if the file doesn't exist.
 * Throws on parse/validation errors.
 */
export function loadWorkspaceConfig(cwd: string): WorkspaceConfig | null {
  const configPath = resolve(cwd, ".pi", "workspace.json");

  if (!existsSync(configPath)) {
    return null;
  }

  let raw: RawConfig;
  try {
    const content = readFileSync(configPath, "utf-8");
    raw = JSON.parse(content);
  } catch (err) {
    throw new Error(`Failed to parse .pi/workspace.json: ${(err as Error).message}`);
  }

  if (!raw.folders || !Array.isArray(raw.folders)) {
    throw new Error(`.pi/workspace.json must have a "folders" array`);
  }

  const seenNames = new Set<string>();
  const folders: WorkspaceFolder[] = [];

  for (const entry of raw.folders) {
    if (!entry.path || typeof entry.path !== "string") {
      throw new Error(`Each folder entry must have a "path" string`);
    }

    const absolutePath = resolve(cwd, entry.path);
    const name = entry.name || basename(absolutePath);

    if (seenNames.has(name)) {
      throw new Error(`Duplicate workspace folder name: "${name}". Use the "name" field to disambiguate.`);
    }
    seenNames.add(name);

    let exists = false;
    try {
      accessSync(absolutePath);
      exists = true;
    } catch {
      // folder doesn't exist
    }

    folders.push({
      rawPath: entry.path,
      absolutePath,
      name,
      envVar: toEnvVarName(name),
      exists,
    });
  }

  return { folders };
}
