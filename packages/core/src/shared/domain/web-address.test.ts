import { describe, expect, it } from "vitest";

import {
	isHttpAddress,
	isUnambiguousAddress,
	webAddressParts,
} from "./web-address";

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

	it("is null when a browser would read another host", () => {
		// Browsers take `\` for `/`: this one goes to evil.example.
		expect(webAddressParts("https://evil.example\\@claude.ai/cb")).toBeNull();
		expect(webAddressParts("https://claude.ai/a\\b")).toBeNull();
		// Browsers split at the last `@`.
		expect(
			webAddressParts("https://claude.ai@evil.example@other.example/"),
		).toBeNull();
		expect(webAddressParts("https://claude.ai\t.evil.example/")).toBeNull();
	});
});

describe("isUnambiguousAddress", () => {
	it("refuses backslashes, spaces and control characters anywhere", () => {
		expect(
			isUnambiguousAddress("https://claude.ai/api/mcp/auth_callback"),
		).toBe(true);
		expect(isUnambiguousAddress("com.example.app:/oauth2redirect")).toBe(true);
		expect(isUnambiguousAddress("https://evil.example\\@claude.ai/cb")).toBe(
			false,
		);
		expect(isUnambiguousAddress("https://evil.example/a b")).toBe(false);
		expect(isUnambiguousAddress("https://claude.ai\n.evil.example/")).toBe(
			false,
		);
		expect(isUnambiguousAddress("https://claude.ai\u0000/")).toBe(false);
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
