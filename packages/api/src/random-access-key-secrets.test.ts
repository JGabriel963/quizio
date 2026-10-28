import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { createRandomAccessKeySecrets } from "./random-access-key-secrets";

describe("random access key secrets (spec 044, RN-05, RN-35)", () => {
	it("a secret is qz_ plus 43 base64url characters and its start is the first 9", () => {
		const { secret, start } = createRandomAccessKeySecrets().create();

		expect(secret).toMatch(/^qz_[A-Za-z0-9_-]{43}$/);
		expect(start).toBe(secret.slice(0, 9));
	});

	it("hashOf gives the stored hash", () => {
		const secrets = createRandomAccessKeySecrets();
		const { secret, secretHash } = secrets.create();

		expect(secretHash).toBe(createHash("sha256").update(secret).digest("hex"));
		expect(secrets.hashOf(secret)).toBe(secretHash);
		expect(secretHash).not.toContain(secret);
	});

	it("two secrets differ", () => {
		const secrets = createRandomAccessKeySecrets();

		expect(secrets.create().secret).not.toBe(secrets.create().secret);
	});
});
