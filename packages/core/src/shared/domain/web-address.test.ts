import { describe, expect, it } from "vitest";

import { isHttpAddress, webAddressParts } from "./web-address";

describe("webAddressParts", () => {
	it("reads the scheme and the host", () => {
		expect(webAddressParts("https://Claude.ai/api/mcp/auth_callback")).toEqual({
			scheme: "https",
			host: "claude.ai",
		});
		expect(webAddressParts("http://localhost:3118/callback?x=1")).toEqual({
			scheme: "http",
			host: "localhost",
		});
		expect(webAddressParts("cursor://anysphere.cursor-mcp/oauth")).toEqual({
			scheme: "cursor",
			host: "anysphere.cursor-mcp",
		});
		expect(webAddressParts("http://[::1]:8080/")).toEqual({
			scheme: "http",
			host: "[::1]",
		});
	});

	it("is null for what is not an address", () => {
		expect(webAddressParts("not a url")).toBeNull();
		expect(webAddressParts("example.com/a.png")).toBeNull();
		expect(webAddressParts("")).toBeNull();
	});
});

describe("isHttpAddress", () => {
	it("takes only http and https", () => {
		expect(isHttpAddress("https://example.com/a.png")).toBe(true);
		expect(isHttpAddress("http://example.com")).toBe(true);
		expect(isHttpAddress("ftp://example.com/a.png")).toBe(false);
		expect(isHttpAddress("javascript:alert(1)")).toBe(false);
	});
});
