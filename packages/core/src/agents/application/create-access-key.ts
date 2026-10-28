import type { Clock } from "../../shared/application/ports/clock";
import type { IdGenerator } from "../../shared/application/ports/id-generator";
import { parseAccessKeyName } from "../domain/access-key";
import { AccessKeyLimitError } from "../domain/agent-errors";
import type { AgentSettings } from "../domain/agent-settings";
import { type AccessKeyView, toAccessKeyView } from "./agent-access-views";
import type { AccessKeyRepository } from "./ports/access-key-repository";
import type { AccessKeySecrets } from "./ports/access-key-secrets";

export interface CreateAccessKeyInput {
	ownerId: string;
	name: string;
}

export interface CreateAccessKeyOutput {
	key: AccessKeyView;
	/** The whole secret, here and nowhere else again (spec 044, RN-05). */
	secret: string;
}

export type CreateAccessKey = (
	input: CreateAccessKeyInput,
) => Promise<CreateAccessKeyOutput>;

/** Criar chave in Agentes de IA (spec 044, RN-05; CA-05, CA-06). */
export function createCreateAccessKey(deps: {
	accessKeys: AccessKeyRepository;
	accessKeySecrets: AccessKeySecrets;
	ids: IdGenerator;
	clock: Clock;
	agentSettings: Pick<AgentSettings, "maxActiveKeys">;
}): CreateAccessKey {
	return async ({ ownerId, name: rawName }) => {
		const name = parseAccessKeyName(rawName);
		const { secret, secretHash, start } = deps.accessKeySecrets.create();
		const key = {
			id: deps.ids.generate(),
			ownerId,
			name,
			start,
			createdAt: deps.clock.now(),
			lastUsedAt: null,
		};

		const limit = deps.agentSettings.maxActiveKeys;
		if (
			(await deps.accessKeys.add({ ...key, secretHash }, limit)) === "limit"
		) {
			throw new AccessKeyLimitError(limit);
		}

		return { key: toAccessKeyView(key), secret };
	};
}
