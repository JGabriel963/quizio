import { describe, expect, it } from "vitest";

import { clientIpOf, UNKNOWN_CLIENT_IP } from "./client-ip";

describe("clientIpOf", () => {
	it("takes the last forwarded address: the one the proxy in front saw (L2)", () => {
		// A client may send its own x-forwarded-for; a proxy that appends to it
		// (nginx's $proxy_add_x_forwarded_for) puts what it saw at the end.
		expect(
			clientIpOf(new Headers({ "x-forwarded-for": "10.9.8.7, 203.0.113.7" })),
		).toBe("203.0.113.7");
		expect(clientIpOf(new Headers({ "x-forwarded-for": "203.0.113.7" }))).toBe(
			"203.0.113.7",
		);
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

	it("counts an IPv6 network by its /64, as a home or a phone gets a whole one (L2)", () => {
		expect(
			clientIpOf(new Headers({ "x-forwarded-for": "2001:db8:1:2:3:4:5:6" })),
		).toBe("2001:db8:1:2::/64");
		expect(
			clientIpOf(new Headers({ "x-forwarded-for": "2001:db8:1:2::ffff" })),
		).toBe("2001:db8:1:2::/64");
		expect(clientIpOf(new Headers({ "x-forwarded-for": "2001:DB8::1" }))).toBe(
			"2001:db8:0:0::/64",
		);
	});

	it("reads an IPv4 address carried in IPv6 as the IPv4 one", () => {
		expect(
			clientIpOf(new Headers({ "x-forwarded-for": "::ffff:203.0.113.7" })),
		).toBe("203.0.113.7");
	});

	it("falls back to one shared key, also for what is not an address", () => {
		expect(clientIpOf(new Headers())).toBe(UNKNOWN_CLIENT_IP);
		for (const value of [" ", "not-an-ip", "203.0.113.7, ", "x".repeat(500)]) {
			expect(clientIpOf(new Headers({ "x-forwarded-for": value })), value).toBe(
				UNKNOWN_CLIENT_IP,
			);
		}
	});
});
