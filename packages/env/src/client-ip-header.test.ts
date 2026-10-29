import { describe, expect, it } from "vitest";

import { resolveClientIpHeader } from "./client-ip-header";

const vps = { nodeEnv: "production", onVercel: false, skipValidation: false };

describe("resolveClientIpHeader (audit L2)", () => {
	it("takes the header that was set", () => {
		expect(resolveClientIpHeader("x-real-ip", vps)).toBe("x-real-ip");
	});

	it("keeps x-forwarded-for on Vercel, which overwrites it, and outside production", () => {
		expect(resolveClientIpHeader(undefined, { ...vps, onVercel: true })).toBe(
			"x-forwarded-for",
		);
		expect(
			resolveClientIpHeader(undefined, { ...vps, nodeEnv: "development" }),
		).toBe("x-forwarded-for");
		expect(
			resolveClientIpHeader(undefined, { ...vps, skipValidation: true }),
		).toBe("x-forwarded-for");
	});

	it("refuses to start in production elsewhere without one", () => {
		expect(() => resolveClientIpHeader(undefined, vps)).toThrow(
			/CLIENT_IP_HEADER/,
		);
	});
});
