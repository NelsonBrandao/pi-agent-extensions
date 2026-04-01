import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { isToolCallEventType } from "@mariozechner/pi-coding-agent";
import { basename } from "node:path";
import { loadWorkspaceConfig, type WorkspaceConfig } from "./config";
import {
  resolveWorkspacePath,
  buildBashExports,
  buildSystemPromptSection,
} from "./resolver";

export default function (pi: ExtensionAPI) {
  let config: WorkspaceConfig | null = null;
  let cwd: string = "";

  function reload(workingDir: string, notify?: (msg: string, level: "info" | "warning" | "error") => void) {
    cwd = workingDir;
    try {
      config = loadWorkspaceConfig(cwd);
      if (config) {
        const count = config.folders.length;
        const missing = config.folders.filter((f) => !f.exists);
        if (missing.length > 0) {
          notify?.(
            `Workspace: ${count} folder(s), ${missing.length} not found: ${missing.map((f) => f.name).join(", ")}`,
            "warning"
          );
        } else {
          notify?.(`Workspace: ${count} folder(s) loaded`, "info");
        }
      }
    } catch (err) {
      config = null;
      notify?.(`Workspace error: ${(err as Error).message}`, "error");
    }
  }

  function updateStatus(workingDir: string, ctx: { ui: { setStatus: (id: string, text: string | undefined) => void } }) {
    if (config && config.folders.length > 0) {
      const cwdName = basename(workingDir);
      const names = config.folders.map((f) => `@${f.name}`).join(" ");
      ctx.ui.setStatus("workspace", `📁 (${cwdName}) ${names}`);
    } else {
      ctx.ui.setStatus("workspace", undefined);
    }
  }

  // --- Session start: load config and set status ---
  pi.on("session_start", async (_event, ctx) => {
    reload(ctx.cwd, ctx.ui.notify.bind(ctx.ui));
    updateStatus(ctx.cwd, ctx);
  });

  // --- System prompt injection ---
  pi.on("before_agent_start", async (event, _ctx) => {
    if (!config || config.folders.length === 0) return;

    return {
      systemPrompt: event.systemPrompt + buildSystemPromptSection(config.folders),
    };
  });

  // --- Tool call interception: resolve @folder paths ---
  pi.on("tool_call", async (event, _ctx) => {
    if (!config || config.folders.length === 0) return;

    // File tools: resolve @folder/path in the path parameter
    if (isToolCallEventType("read", event)) {
      event.input.path = resolveWorkspacePath(event.input.path, config.folders, cwd);
    }

    if (isToolCallEventType("write", event)) {
      event.input.path = resolveWorkspacePath(event.input.path, config.folders, cwd);
    }

    if (isToolCallEventType("edit", event)) {
      event.input.path = resolveWorkspacePath(event.input.path, config.folders, cwd);
    }

    // Bash: prepend env var exports
    if (isToolCallEventType("bash", event)) {
      const exports = buildBashExports(config.folders);
      if (exports) {
        event.input.command = exports + event.input.command;
      }
    }
  });

  // --- /workspace command ---
  pi.registerCommand("workspace", {
    description: "Manage workspace folders (list, reload)",
    handler: async (args, ctx) => {
      const subcommand = (args || "").trim().toLowerCase();

      if (subcommand === "reload") {
        reload(ctx.cwd, ctx.ui.notify.bind(ctx.ui));
        updateStatus(ctx.cwd, ctx);
        return;
      }

      // Default: list
      if (!config || config.folders.length === 0) {
        ctx.ui.notify("No workspace configured. Create .pi/workspace.json to get started.", "info");
        return;
      }

      const cwdName = basename(ctx.cwd);
      const lines = ["Workspace folders:", ""];
      lines.push(`  ✓ (${cwdName}) — current directory`);
      lines.push(`      Path: ${ctx.cwd}`);
      lines.push("");
      for (const folder of config.folders) {
        const status = folder.exists ? "✓" : "✗ NOT FOUND";
        lines.push(`  ${status} @${folder.name}`);
        lines.push(`      Path: ${folder.absolutePath}`);
        lines.push(`      Bash: $${folder.envVar}`);
        lines.push("");
      }
      ctx.ui.notify(lines.join("\n"), "info");
    },
  });
}
