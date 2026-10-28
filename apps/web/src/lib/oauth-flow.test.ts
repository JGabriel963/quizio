import { describe, expect, it } from "vitest";

import {
	afterSignInPath,
	decodeAgentRequest,
	encodeAgentRequest,
} from "./oauth-flow";

const SIGNED =
	"response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A4000%2Fcallback&client_id=abc&exp=1793210139&ba_param=client_id&ba_param=exp&sig=4Xh0fVGGcYiK74Hi%2FSwrFMX1fOK4F7E%3D";

describe("the agent's authorization request (spec 044, RN-03)", () => {
	it("keeps the signed query exactly as Better Auth wrote it, repeated keys and all", () => {
		const wrapped = encodeAgentRequest(SIGNED);

		expect(wrapped).toMatch(/^[A-Za-z0-9_-]+$/);
		expect(decodeAgentRequest(wrapped)).toBe(SIGNED);
	});

	it("a wrapped request that does not decode is none", () => {
		expect(decodeAgentRequest("%%%")).toBeNull();
		expect(decodeAgentRequest(undefined)).toBeNull();
	});

	it("afterSignIn goes to the authorization screen during an authorization and to the safe redirect otherwise", () => {
		const wrapped = encodeAgentRequest(SIGNED);

		expect(afterSignInPath({ agent: wrapped, redirect: "/library" })).toBe(
			`/connect?request=${wrapped}`,
		);
		expect(afterSignInPath({ redirect: "/library" })).toBe("/library");
		expect(afterSignInPath({ redirect: "https://evil.example" })).toBe("/");
	});
});
