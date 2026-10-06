import { describe, expect, it } from "vitest";

import { clientIpOf, UNKNOWN_CLIENT_IP } from "./client-ip";

describe("clientIpOf", () => {
	it("takes the first forwarded address", () => {
		expect(
			clientIpOf(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" })),
		).toBe("203.0.113.7");
	});

	it("reads the header the proxy in front of the app controls", () => {
		const headers = new Headers({
			"x-forwarded-for": "198.51.100.9",
			"x-real-ip": "203.0.113.7",
		});

		expect(clientIpOf(headers, "x-real-ip")).toBe("203.0.113.7");
		expect(
			clientIpOf(new Headers({ "x-forwarded-for": "1.2.3.4" }), "x-real-ip"),
		).toBe(UNKNOWN_CLIENT_IP);
	});

	it("falls back to one shared key", () => {
		expect(clientIpOf(new Headers())).toBe(UNKNOWN_CLIENT_IP);
		expect(clientIpOf(new Headers({ "x-forwarded-for": " " }))).toBe(
			UNKNOWN_CLIENT_IP,
		);
	});
});
