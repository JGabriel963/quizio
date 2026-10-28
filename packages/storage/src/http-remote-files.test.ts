import { describe, expect, it } from "vitest";

import { isPublicAddress } from "./http-remote-files";

describe("isPublicAddress (spec 044, RN-24)", () => {
	it("takes public IPv4 and IPv6 addresses", () => {
		for (const ip of [
			"8.8.8.8",
			"151.101.1.69",
			"2606:4700:4700::1111",
			"2a00:1450:4001:82a::200e",
		]) {
			expect(isPublicAddress(ip), ip).toBe(true);
		}
	});

	it("isPublicAddress refuses private, loopback, link-local, CGNAT, metadata and IPv4-mapped IPv6 addresses", () => {
		for (const ip of [
			"0.0.0.0",
			"10.0.0.5",
			"100.64.1.1",
			"127.0.0.1",
			"169.254.169.254",
			"172.16.0.1",
			"172.31.255.255",
			"192.168.1.10",
			"198.18.0.1",
			"224.0.0.1",
			"255.255.255.255",
			"::",
			"::1",
			"fc00::1",
			"fd00:ec2::254",
			"fe80::1",
			"ff02::1",
			"::ffff:127.0.0.1",
			"::ffff:169.254.169.254",
			"64:ff9b::a9fe:a9fe",
			"not-an-ip",
		]) {
			expect(isPublicAddress(ip), ip).toBe(false);
		}
	});

	it("reads an IPv4-mapped address in any spelling, as a link's host comes in hex", () => {
		// `new URL("http://[::ffff:127.0.0.1]").hostname` is `[::ffff:7f00:1]`.
		for (const ip of [
			"::ffff:7f00:1",
			"::FFFF:7F00:0001",
			"0:0:0:0:0:ffff:7f00:1",
			"::ffff:a9fe:a9fe",
			"::ffff:a00:5",
			"::ffff:0:0",
			// IPv4-compatible, deprecated: never a public address.
			"::7f00:1",
			"::808:808",
		]) {
			expect(isPublicAddress(ip), ip).toBe(false);
		}
		expect(isPublicAddress("::ffff:808:808")).toBe(true);
	});
});
