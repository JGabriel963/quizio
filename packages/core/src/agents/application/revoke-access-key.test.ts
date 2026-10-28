import { describe, expect, it } from "vitest";

import { AccessKeyNotFoundError } from "../domain/agent-errors";
import { agentsTestDeps } from "../testing/agents-test-deps";
import { createCreateAccessKey } from "./create-access-key";
import { createRevokeAccessKey } from "./revoke-access-key";

describe("revokeAccessKey (spec 044, RN-16)", () => {
	it("revokes the owner's key", async () => {
		const deps = agentsTestDeps();
		const { key } = await createCreateAccessKey(deps)({
			ownerId: "ana",
			name: "Script",
		});

		await createRevokeAccessKey(deps)({ ownerId: "ana", keyId: key.id });

		expect(deps.accessKeys.stored()).toEqual([]);
	});

	it("someone else's key is not found (AGENT.KEY_NOT_FOUND)", async () => {
		const deps = agentsTestDeps();
		const { key } = await createCreateAccessKey(deps)({
			ownerId: "ana",
			name: "Script",
		});

		await expect(
			createRevokeAccessKey(deps)({ ownerId: "bruno", keyId: key.id }),
		).rejects.toBeInstanceOf(AccessKeyNotFoundError);
		expect(deps.accessKeys.stored()).toHaveLength(1);
	});
});
