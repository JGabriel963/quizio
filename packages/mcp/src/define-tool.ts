import type { Container } from "@quizio/api/container";
import type { AgentIdentity } from "@quizio/core/agents/domain/agent-identity";
import type { z } from "zod";

import type { QuizioLinks } from "./links";

export type UseCases = Container["useCases"];

/**
 * What a tool does to the account, told to the agent as annotations (spec
 * 044, RN-32): `read` changes nothing; `write` adds or changes; `idempotent`
 * writes, and repeating it changes nothing more; `destructive` cannot be
 * undone, so the agent should confirm with the person first.
 */
export type ToolKind = "read" | "write" | "idempotent" | "destructive";

export interface ToolContext {
	/** Who the agent acts for: every use case gets this person (RN-09). */
	identity: AgentIdentity;
	useCases: UseCases;
	links: QuizioLinks;
}

export interface ToolDefinition<Input extends z.ZodObject = z.ZodObject> {
	/** snake_case, verb first (`create_quiz`). */
	name: string;
	title: string;
	/** In English, with the rules and limits that apply (RN-10). */
	description: string;
	kind: ToolKind;
	input: Input;
	/** What it returns is sent to the agent as is, dates as ISO strings. */
	run: (input: z.infer<Input>, context: ToolContext) => Promise<unknown>;
}

/** Keeps the input's type between the schema and `run`. */
export function defineTool<Input extends z.ZodObject>(
	tool: ToolDefinition<Input>,
): ToolDefinition<Input> {
	return tool;
}

export function annotationsOf(kind: ToolKind) {
	switch (kind) {
		case "read":
			return { readOnlyHint: true, openWorldHint: false };
		case "write":
		case "idempotent":
			return {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: kind === "idempotent",
				openWorldHint: false,
			};
		case "destructive":
			return {
				readOnlyHint: false,
				destructiveHint: true,
				idempotentHint: false,
				openWorldHint: false,
			};
	}
}
