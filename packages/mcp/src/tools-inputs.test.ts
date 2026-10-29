import { unboundedStrings } from "@quizio/api/testing/unbounded-strings";
import { describe, expect, it } from "vitest";

import { QUIZIO_TOOLS } from "./tools";

describe("the inputs of the MCP tools (audit L6)", () => {
	it("give every string a maximum", () => {
		const unbounded = QUIZIO_TOOLS.flatMap((tool) =>
			unboundedStrings(tool.input, tool.name),
		);

		expect(unbounded).toEqual([]);
	});
});
