import { describe, expect, it } from "vitest";

import { unboundedStrings } from "../testing/unbounded-strings";
import { appRouter } from "./index";

interface ProcedureDef {
	type: "query" | "mutation" | "subscription";
	inputs: unknown[];
}

/** The keys of a procedure's input, when it is a zod object. */
function inputKeys(def: ProcedureDef): string[] {
	return def.inputs.flatMap((input) => {
		const shape = (input as { shape?: Record<string, unknown> }).shape;
		return shape ? Object.keys(shape) : [];
	});
}

describe("the player's secret (audit L3)", () => {
	it("never goes in a query, whose input travels in the address", () => {
		const procedures = appRouter._def.procedures as unknown as Record<
			string,
			{ _def: ProcedureDef }
		>;

		const readsWithSecret = Object.entries(procedures)
			.filter(
				([, procedure]) =>
					procedure._def.type === "query" &&
					inputKeys(procedure._def).includes("secret"),
			)
			.map(([path]) => path);

		expect(readsWithSecret).toEqual([]);
		// The check finds what it looks for: these carry the secret.
		expect(
			inputKeys(procedures["game.join.session"]?._def as ProcedureDef),
		).toContain("secret");
	});
});

describe("the inputs of the API (audit L6)", () => {
	it("give every string a maximum", () => {
		const procedures = appRouter._def.procedures as unknown as Record<
			string,
			{ _def: ProcedureDef }
		>;

		const unbounded = Object.entries(procedures).flatMap(([path, procedure]) =>
			procedure._def.inputs.flatMap((input) => unboundedStrings(input, path)),
		);

		expect(unbounded).toEqual([]);
	});

	it("finds a string without a maximum", async () => {
		const { z } = await import("zod");

		expect(
			unboundedStrings(
				z.object({
					title: z.string().nullable(),
					items: z.array(z.object({ text: z.string().max(5) })),
				}),
			),
		).toEqual(["input.title"]);
	});
});
