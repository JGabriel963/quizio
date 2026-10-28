import {
	assertCreatorName,
	normalizeCreatorName,
} from "../domain/sign-up-rules";
import type { AccountRepository } from "./ports/account-repository";

export type RenameCreator = (input: {
	userId: string;
	name: string;
}) => Promise<void>;

/**
 * The name an AI agent changes (spec 044, RN-19), with the sign-up rules that
 * Seu perfil applies through Better Auth (spec 039, RN-13).
 */
export function createRenameCreator(deps: {
	accounts: Pick<AccountRepository, "rename">;
}): RenameCreator {
	return async ({ userId, name: rawName }) => {
		const name = normalizeCreatorName(rawName);
		assertCreatorName(name);
		await deps.accounts.rename(userId, name);
	};
}
