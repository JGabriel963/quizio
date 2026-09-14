import { describe, expect, it } from "vitest";

import { createTestApi } from "../testing/test-context";

describe("auth.settings", () => {
	it.each([
		{ signUpEnabled: true, googleEnabled: false },
		{ signUpEnabled: false, googleEnabled: true },
	])(
		"exposes sign-up and Google availability to visitors: %o",
		async (authSettings) => {
			const visitor = createTestApi({ authSettings }).callerFor(null);

			expect(await visitor.auth.settings()).toEqual(authSettings);
		},
	);
});
