import type { ToolDefinition } from "./define-tool";
import { accountTools } from "./tools/account";
import { assignmentTools } from "./tools/assignments";
import { fileTools } from "./tools/files";
import { groupPostTools } from "./tools/group-posts";
import { groupTools } from "./tools/groups";
import { libraryTools } from "./tools/library";
import { liveGameTools } from "./tools/live-games";
import { notificationTools } from "./tools/notifications";
import { questionTools } from "./tools/questions";
import { quizTools } from "./tools/quizzes";
import { reportTools } from "./tools/reports";
import { themeTools } from "./tools/themes";

/** Every tool the Quizio MCP server offers, in the order agents list them. */
export const QUIZIO_TOOLS: readonly ToolDefinition[] = [
	...accountTools,
	...libraryTools,
	...quizTools,
	...questionTools,
	...fileTools,
	...themeTools,
	...liveGameTools,
	...assignmentTools,
	...reportTools,
	...groupTools,
	...groupPostTools,
	...notificationTools,
] as unknown as readonly ToolDefinition[];
