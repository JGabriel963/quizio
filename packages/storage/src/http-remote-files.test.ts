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
});
