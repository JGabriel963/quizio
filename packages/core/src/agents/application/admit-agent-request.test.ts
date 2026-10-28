import { describe, expect, it } from "vitest";

import {
	AgentRateLimitedError,
	AgentUnauthorizedError,
} from "../domain/agent-errors";
import { agentsTestDeps } from "../testing/agents-test-deps";
import { createAdmitAgentRequest } from "./admit-agent-request";
import { createCreateAccessKey } from "./create-access-key";
import { createRevokeAccessKey } from "./revoke-access-key";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("admitAgentRequest (spec 044, RN-06, RN-16, RN-18, RN-33)", () => {
	it("a valid access key gives the owner's identity and records its use", async () => {
		const deps = agentsTestDeps();
		const { key, secret } = await createCreateAccessKey(deps)({
			ownerId: "ana",
			name: "Script",
		});

		const identity = await createAdmitAgentRequest(deps)({ token: secret });

		expect(identity).toEqual({
			userId: "ana",
			credential: { kind: "key", keyId: key.id },
		});
		expect((await deps.accessKeys.listFor("ana"))[0]?.lastUsedAt).toEqual(
			deps.clock.now(),
		);
	});

	it("a verified token whose connection still exists gives the user's identity", async () => {
		const deps = agentsTestDeps();
		const connection = deps.agentConnections.connect({
			userId: "ana",
			clientId: "client-claude",
		});
		deps.agentTokens.issue("jwt-ana", {
			userId: "ana",
			clientId: "client-claude",
		});

		const identity = await createAdmitAgentRequest(deps)({ token: "jwt-ana" });

		expect(identity).toEqual({
			userId: "ana",
			credential: {
				kind: "connection",
				connectionId: connection.id,
				clientId: "client-claude",
			},
		});
		expect(
			(await deps.agentConnections.find("ana", "client-claude"))?.lastUsedAt,
		).toEqual(deps.clock.now());
	});

	it("no token, an unknown or revoked key, an invalid token and a disconnected connection are unauthorized", async () => {
		const deps = agentsTestDeps();
		const admit = createAdmitAgentRequest(deps);
		const { key, secret } = await createCreateAccessKey(deps)({
			ownerId: "ana",
			name: "Script",
		});
		await createRevokeAccessKey(deps)({ ownerId: "ana", keyId: key.id });
		deps.agentTokens.issue("jwt-gone", { userId: "ana", clientId: "gone" });

		for (const token of [
			null,
			"",
			"qz_unknown",
			secret,
			"garbage",
			"jwt-gone",
		]) {
			await expect(admit({ token })).rejects.toBeInstanceOf(
				AgentUnauthorizedError,
			);
		}
	});

	it("a connection idle for 90 days is unauthorized, a key idle as long is not", async () => {
		const deps = agentsTestDeps();
		const admit = createAdmitAgentRequest(deps);
		const now = deps.clock.now();
		deps.agentConnections.connect({
			userId: "ana",
			clientId: "client-old",
			connectedAt: new Date(now.getTime() - 200 * DAY_MS),
			lastUsedAt: new Date(now.getTime() - 91 * DAY_MS),
		});
		deps.agentTokens.issue("jwt-old", {
			userId: "ana",
			clientId: "client-old",
		});
		const { secret } = await createCreateAccessKey(deps)({
			ownerId: "ana",
			name: "Script",
		});
		deps.clock.advanceBy(91 * DAY_MS);

		await expect(admit({ token: "jwt-old" })).rejects.toBeInstanceOf(
			AgentUnauthorizedError,
		);
		await expect(admit({ token: secret })).resolves.toMatchObject({
			userId: "ana",
		});
	});

	it("the 121st request in a minute is rate limited with the seconds to wait, and an invalid token never counts", async () => {
		const deps = agentsTestDeps();
		const admit = createAdmitAgentRequest(deps);
		const { secret } = await createCreateAccessKey(deps)({
			ownerId: "ana",
			name: "Script",
		});
		deps.clock.advanceBy(15_000);
		for (let index = 0; index < 50; index++) {
			await admit({ token: "garbage" }).catch(() => {});
		}
		for (let index = 0; index < 120; index++) {
			await admit({ token: secret });
		}

		const refused = await admit({ token: secret }).catch((error) => error);

		expect(refused).toBeInstanceOf(AgentRateLimitedError);
		expect((refused as AgentRateLimitedError).retryAfterSeconds).toBe(45);
		deps.clock.advanceBy(45_000);
		await expect(admit({ token: secret })).resolves.toMatchObject({
			userId: "ana",
		});
	});
});
