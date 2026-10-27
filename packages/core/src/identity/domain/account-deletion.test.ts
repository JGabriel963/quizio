import { describe, expect, it } from "vitest";

import {
	ACCOUNT_DELETION_REASONS,
	DELETION_FEEDBACK_MAX_LENGTH,
	parseDeletionRequest,
} from "./account-deletion";
import { InvalidDeletionRequestError } from "./account-errors";

describe("account deletion request", () => {
	it("ACCOUNT_DELETION_REASONS keeps the eight reasons in order", () => {
		expect(ACCOUNT_DELETION_REASONS).toEqual([
			"otherAccount",
			"newProfile",
			"thoughtNeededAccountToPlay",
			"missingFeatures",
			"technicalProblems",
			"notUsing",
			"notWhatExpected",
			"other",
		]);
	});

	it("parseDeletionRequest trims the feedback and turns empty into null", () => {
		expect(
			parseDeletionRequest({ reason: "notUsing", feedback: "  muito bom  " }),
		).toEqual({ reason: "notUsing", feedback: "muito bom" });
		expect(parseDeletionRequest({ reason: "other", feedback: "   " })).toEqual({
			reason: "other",
			feedback: null,
		});
		expect(parseDeletionRequest({ reason: "other" })).toEqual({
			reason: "other",
			feedback: null,
		});
	});

	it("parseDeletionRequest refuses an unknown reason and feedback over 1000 characters", () => {
		expect(() => parseDeletionRequest({ reason: "bored" })).toThrow(
			InvalidDeletionRequestError,
		);
		expect(
			parseDeletionRequest({
				reason: "other",
				feedback: "é".repeat(DELETION_FEEDBACK_MAX_LENGTH),
			}).feedback,
		).toHaveLength(DELETION_FEEDBACK_MAX_LENGTH);
		expect(() =>
			parseDeletionRequest({
				reason: "other",
				feedback: "a".repeat(DELETION_FEEDBACK_MAX_LENGTH + 1),
			}),
		).toThrow(InvalidDeletionRequestError);
	});
});
