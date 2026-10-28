import { ASSIGNMENT_DEFAULT_MAX_DEADLINE_DAYS } from "@quizio/core/game/domain/assignment";
import { z } from "zod";

/**
 * An assignment's deadline (spec 029, RN-08): the date, the hour and the
 * zone, so the agent never guesses the person's time zone. The rules (later
 * than now, at most the instance's days ahead) are the core's.
 */
export const deadline = z.iso
	.datetime({ offset: true })
	.describe(
		`ISO 8601 date-time with the person's time zone offset, like 2026-11-20T23:59:00-03:00. Later than now and at most ${ASSIGNMENT_DEFAULT_MAX_DEADLINE_DAYS} days ahead (the instance may set another limit; a refusal says it).`,
	);
