import type { AccessKey } from "../domain/access-key";

const AT = new Date("2026-10-28T12:00:00.000Z");

/** Ana's "Script da escola" key, never used, unless told otherwise. */
export function anAccessKey(overrides: Partial<AccessKey> = {}): AccessKey {
	return {
		id: "key-1",
		ownerId: "ana",
		name: "Script da escola",
		start: "qz_test-1",
		createdAt: AT,
		lastUsedAt: null,
		...overrides,
	};
}
