import { reportDateLabel } from "./report-labels";

/** The activity's page: no PIN to type (spec 029, RN-19). */
export function assignmentLink(origin: string, gameId: string): string {
	return `${origin}/assignment/${gameId}`;
}

/** What "Compartilhar" sends (RN-23). */
export function assignmentShareMessage(input: {
	name: string;
	deadline: Date | string;
	link: string;
}): string {
	return `Jogue ${input.name} até ${reportDateLabel(input.deadline)}: ${input.link}`;
}
