/**
 * Auto Session Namer
 *
 * Automatically names sessions based on the first user message.
 * Uses a lightweight LLM call to generate a short, descriptive name
 * that appears in the session selector (/resume) instead of the raw first message.
 *
 * Prefers cheap models (Haiku → Gemini Flash → GPT-4o-mini → Sonnet) and
 * falls back to the current model if none are available.
 *
 * Only triggers once per session — skips if a name is already set.
 */

import { complete } from "@mariozechner/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";

// Cheap models to try, in order of preference
const PREFERRED_MODELS: Array<{ provider: string; id: string }> = [
	{ provider: "anthropic", id: "claude-haiku" },
	{ provider: "google", id: "gemini-2.5-flash" },
	{ provider: "openai", id: "gpt-4o-mini" },
	{ provider: "anthropic", id: "claude-sonnet" },
];

async function findNamingModel(ctx: ExtensionContext) {
	// Try cheap models first
	for (const candidate of PREFERRED_MODELS) {
		const model = ctx.modelRegistry.find(candidate.provider, candidate.id);
		if (!model) continue;

		const auth = await ctx.modelRegistry.getApiKeyAndHeaders(model);
		if (auth?.ok && auth.apiKey) {
			return { model, auth };
		}
	}

	// Fall back to current model
	const model = ctx.model;
	if (!model) return undefined;

	const auth = await ctx.modelRegistry.getApiKeyAndHeaders(model);
	if (!auth?.ok || !auth.apiKey) return undefined;

	return { model, auth };
}

export default function (pi: ExtensionAPI) {
	let hasNamedThisSession = false;

	pi.on("session_start", async (_event, _ctx) => {
		// Check if session already has a name
		hasNamedThisSession = !!pi.getSessionName();
	});

	pi.on("agent_end", async (_event, ctx) => {
		// Only name once per session
		if (hasNamedThisSession) return;
		hasNamedThisSession = true;

		// Find the first user message in this session
		const branch = ctx.sessionManager.getBranch();
		let firstUserMessage: string | undefined;

		for (const entry of branch) {
			if (
				entry.type === "message" &&
				entry.message.role === "user"
			) {
				const content = entry.message.content;
				if (typeof content === "string") {
					firstUserMessage = content;
				} else if (Array.isArray(content)) {
					const textParts = content
						.filter((c: { type: string }) => c.type === "text")
						.map((c: { type: string; text: string }) => c.text);
					firstUserMessage = textParts.join(" ");
				}
				break;
			}
		}

		if (!firstUserMessage || !firstUserMessage.trim()) return;

		// Find a cheap model, or fall back to current
		const resolved = await findNamingModel(ctx);
		if (!resolved) return;

		const { model, auth } = resolved;

		try {
			const response = await complete(
				model,
				{
					messages: [
						{
							role: "user" as const,
							content: [
								{
									type: "text" as const,
									text: [
										"Generate a very short session name (3-6 words max) that captures the essence of this user request.",
										"Return ONLY the name, nothing else. No quotes, no punctuation, no explanation.",
										"Use lowercase, be specific and descriptive.",
										"",
										"Examples of good names:",
										"- fix auth token refresh",
										"- add dark mode toggle",
										"- refactor database queries",
										"- debug websocket connection",
										"- setup CI pipeline",
										"",
										"User message:",
										firstUserMessage,
									].join("\n"),
								},
							],
							timestamp: Date.now(),
						},
					],
				},
				{
					apiKey: auth.apiKey,
					headers: auth.headers,
				},
			);

			const name = response.content
				.filter((c): c is { type: "text"; text: string } => c.type === "text")
				.map((c) => c.text)
				.join("")
				.trim()
				// Clean up: remove quotes, limit length
				.replace(/^["']|["']$/g, "")
				.slice(0, 60);

			if (name) {
				pi.setSessionName(name);
			}
		} catch {
			// Silently fail — naming is best-effort
		}
	});
}
