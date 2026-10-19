import {
	type AssignmentOptions,
	DEFAULT_ASSIGNMENT_OPTIONS,
} from "../domain/assignment";
import type { AssignmentPreferencesRepository } from "./ports/assignment-preferences-repository";

export interface AssignmentSetup {
	/** What "Mais opções" starts with (spec 029, RN-14). */
	options: AssignmentOptions;
	/** How far ahead the calendar goes (RN-08). */
	maxDeadlineDays: number;
}

export type GetAssignmentSetup = (input: {
	ownerId: string;
}) => Promise<AssignmentSetup>;

/** What "Configurar atividade" opens with. */
export function createGetAssignmentSetup(deps: {
	assignmentPreferences: Pick<AssignmentPreferencesRepository, "find">;
	maxDeadlineDays: number;
}): GetAssignmentSetup {
	return async ({ ownerId }) => ({
		options:
			(await deps.assignmentPreferences.find(ownerId)) ??
			DEFAULT_ASSIGNMENT_OPTIONS,
		maxDeadlineDays: deps.maxDeadlineDays,
	});
}
