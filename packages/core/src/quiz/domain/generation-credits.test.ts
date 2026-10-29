import { describe, expect, it } from "vitest";

import {
	DEFAULT_GENERATION_OPTIONS,
	type GenerationOptions,
} from "./generation";
import {
	creditsOf,
	DEFAULT_CREDIT_PRICING,
	estimateGeneration,
	maxOutputTokensFor,
	parseCreditPricing,
	settleCharge,
} from "./generation-credits";

const pricing = DEFAULT_CREDIT_PRICING;
const withCount = (count: GenerationOptions["count"]): GenerationOptions => ({
	...DEFAULT_GENERATION_OPTIONS,
	count,
});
const extracting: GenerationOptions = {
	...DEFAULT_GENERATION_OPTIONS,
	format: "extract",
	language: "auto",
	count: 30,
};

describe("creditsOf (spec 045, RN-01, RN-02)", () => {
	it("converts input and output tokens by the instance's weights", () => {
		const weights = { inputPer1kTokens: 1, outputPer1kTokens: 2 };

		expect(creditsOf({ inputTokens: 2000, outputTokens: 3000 }, weights)).toBe(
			8,
		);
	});

	it("a creation costs a whole number of credits, rounded up", () => {
		// 1,500 × 0.1 + 2,500 × 0.25 per thousand = 0.775
		expect(creditsOf({ inputTokens: 1500, outputTokens: 2500 }, pricing)).toBe(
			1,
		);
		expect(creditsOf({ inputTokens: 1500, outputTokens: 4500 }, pricing)).toBe(
			2,
		);
	});

	it("a creation costs at least 1 credit", () => {
		expect(creditsOf({ inputTokens: 0, outputTokens: 0 }, pricing)).toBe(1);
	});

	it("weights like 0.1 add no floating-point error (counted in thousandths)", () => {
		// 30 × 0.1 is 3.0000000000000004 in floating point.
		expect(creditsOf({ inputTokens: 30_000, outputTokens: 0 }, pricing)).toBe(
			3,
		);
	});

	it("doubling the weights doubles the credits", () => {
		const usage = { inputTokens: 10_000, outputTokens: 8000 };
		const doubled = { inputPer1kTokens: 0.2, outputPer1kTokens: 0.5 };

		expect(creditsOf(usage, doubled)).toBe(2 * creditsOf(usage, pricing));
	});
});

describe("parseCreditPricing (spec 045, RN-04)", () => {
	it("takes positive weights", () => {
		expect(
			parseCreditPricing({ inputPer1kTokens: 0.1, outputPer1kTokens: 0.25 }),
		).toEqual({ inputPer1kTokens: 0.1, outputPer1kTokens: 0.25 });
	});

	it("refuses zero, negative and non-finite weights", () => {
		for (const weight of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
			expect(() =>
				parseCreditPricing({ inputPer1kTokens: weight, outputPer1kTokens: 1 }),
			).toThrow(RangeError);
			expect(() =>
				parseCreditPricing({ inputPer1kTokens: 1, outputPer1kTokens: weight }),
			).toThrow(RangeError);
		}
	});
});

describe("estimateGeneration (spec 045, RN-06, RN-07)", () => {
	it("the output cap follows the requested count", () => {
		expect(maxOutputTokensFor(withCount(10))).toBe(4500);
		expect(maxOutputTokensFor(withCount(30))).toBe(11_500);
	});

	it("extracting is capped as 30 questions", () => {
		expect(maxOutputTokensFor(extracting)).toBe(
			maxOutputTokensFor(withCount(30)),
		);
	});

	it("a short topic of about 10 questions is estimated at 2 credits by default", () => {
		expect(
			estimateGeneration(
				{ kind: "topic", characters: "Sistema solar".length },
				withCount(10),
				pricing,
			),
		).toEqual({ credits: 2, maxOutputTokens: 4500 });
	});

	it("a longer count raises the estimate", () => {
		const topic = { kind: "topic", characters: 200 } as const;

		expect(
			estimateGeneration(topic, withCount(30), pricing).credits,
		).toBeGreaterThan(
			estimateGeneration(topic, withCount(10), pricing).credits,
		);
	});

	it("more PDF pages raise the estimate", () => {
		const five = estimateGeneration(
			{ kind: "pdf", pages: 5 },
			withCount(20),
			pricing,
		);
		const thirty = estimateGeneration(
			{ kind: "pdf", pages: 30 },
			withCount(20),
			pricing,
		);

		expect(thirty.credits).toBeGreaterThan(five.credits);
		expect(thirty.credits).toBe(12);
	});

	it("an estimate is at least 1 credit", () => {
		expect(
			estimateGeneration({ kind: "topic", characters: 1 }, withCount(5), {
				inputPer1kTokens: 0.001,
				outputPer1kTokens: 0.001,
			}).credits,
		).toBe(1);
	});
});

describe("settleCharge (spec 045, RN-09, RN-10, RN-13)", () => {
	const estimate = { credits: 3, maxOutputTokens: 4500 };

	it("charges the real usage and never more than the estimate", () => {
		expect(
			settleCharge(
				estimate,
				{ inputTokens: 1500, outputTokens: 2500 },
				pricing,
			),
		).toEqual({ charged: 1, spent: 1 });
	});

	it("the instance spends the real usage, even past the estimate", () => {
		// 30,000 × 0.1 + 8,000 × 0.25 per thousand = 5
		expect(
			settleCharge(
				estimate,
				{ inputTokens: 30_000, outputTokens: 8000 },
				pricing,
			),
		).toEqual({ charged: 3, spent: 5 });
	});

	it("without a reported usage the estimate is charged and spent", () => {
		expect(settleCharge(estimate, null, pricing)).toEqual({
			charged: 3,
			spent: 3,
		});
	});
});
