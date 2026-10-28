import { describe, expect, it } from "vitest";

import { InvalidCreatorNameError } from "../domain/sign-up-rules";
import { InMemoryAccountRepository } from "../testing/in-memory-account-repository";
import { createRenameCreator } from "./rename-creator";

describe("renameCreator (spec 044, RN-19)", () => {
	const setup = () => {
		const accounts = new InMemoryAccountRepository();
		accounts.add({ id: "ana", name: "Ana", email: "ana@example.com" });
		return { accounts, rename: createRenameCreator({ accounts }) };
	};

	it("renames with the sign-up name rules", async () => {
		const { accounts, rename } = setup();

		await rename({ userId: "ana", name: "  Ana Souza " });

		expect((await accounts.find("ana"))?.name).toBe("Ana Souza");
	});

	it("refuses a 1- or 51-character name", async () => {
		const { accounts, rename } = setup();

		await expect(rename({ userId: "ana", name: "A" })).rejects.toBeInstanceOf(
			InvalidCreatorNameError,
		);
		await expect(
			rename({ userId: "ana", name: "a".repeat(51) }),
		).rejects.toBeInstanceOf(InvalidCreatorNameError);
		expect((await accounts.find("ana"))?.name).toBe("Ana");
	});
});
