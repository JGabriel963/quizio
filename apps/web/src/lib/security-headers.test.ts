import { describe, expect, it } from "vitest";

import { SECURITY_HEADERS, withSecurityHeaders } from "./security-headers";

describe("withSecurityHeaders (L10)", () => {
	it("forbids framing, sniffing and full referrers on every response", async () => {
		const response = withSecurityHeaders(
			new Response("<p>Quizio</p>", {
				status: 201,
				headers: { "content-type": "text/html" },
			}),
		);

		expect(response.headers.get("x-frame-options")).toBe("DENY");
		expect(response.headers.get("content-security-policy")).toBe(
			"frame-ancestors 'none'",
		);
		expect(response.headers.get("x-content-type-options")).toBe("nosniff");
		expect(response.headers.get("referrer-policy")).toBe(
			"strict-origin-when-cross-origin",
		);
		// What the route said stays as it was.
		expect(response.status).toBe(201);
		expect(response.headers.get("content-type")).toBe("text/html");
		expect(await response.text()).toBe("<p>Quizio</p>");
	});

	it("also works on a response whose headers cannot be changed", () => {
		const redirect = Response.redirect("http://localhost:3001/login", 302);

		const response = withSecurityHeaders(redirect);

		expect(response.status).toBe(302);
		expect(response.headers.get("location")).toBe(
			"http://localhost:3001/login",
		);
		expect(response.headers.get("x-frame-options")).toBe("DENY");
	});

	it("keeps a header a route set on purpose", () => {
		const response = withSecurityHeaders(
			new Response(null, {
				headers: { "referrer-policy": "no-referrer" },
			}),
		);

		expect(response.headers.get("referrer-policy")).toBe("no-referrer");
		expect(Object.keys(SECURITY_HEADERS)).toHaveLength(4);
	});
});
