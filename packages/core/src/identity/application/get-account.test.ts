import { describe, expect, it } from "vitest";

import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { InMemoryProfilePhotoRepository } from "../../shared/testing/in-memory-profile-photo-repository";
import { CreatorProfileNotFoundError } from "../domain/account-errors";
import { FakeAccountCredentials } from "../testing/fake-account-credentials";
import { InMemoryAccountRepository } from "../testing/in-memory-account-repository";
import { createGetAccount } from "./get-account";

function setup() {
	const accounts = new InMemoryAccountRepository();
	const credentials = new FakeAccountCredentials();
	const profilePhotos = new InMemoryProfilePhotoRepository();
	const getAccount = createGetAccount({
		accounts,
		credentials,
		profilePhotos,
		storage: new InMemoryObjectStorage(),
	});
	return { accounts, credentials, profilePhotos, getAccount };
}

describe("getAccount", () => {
	it("returns name, email, photoUrl and hasPassword", async () => {
		const { accounts, credentials, profilePhotos, getAccount } = setup();
		accounts.add({ id: "u1", name: "Ana", email: "ana@quizio.test" });
		credentials.setPassword("u1", "segredo-123");
		await profilePhotos.save("u1", "profiles/u1/a.webp");

		expect(await getAccount({ userId: "u1" })).toEqual({
			userId: "u1",
			name: "Ana",
			email: "ana@quizio.test",
			photoUrl: "https://media.test/profiles/u1/a.webp",
			hasPassword: true,
		});
	});

	it("getAccount has no photo for a Google user until one is uploaded", async () => {
		const { accounts, getAccount } = setup();
		accounts.add({ id: "u2", name: "Bia", email: "bia@gmail.test" });

		expect(await getAccount({ userId: "u2" })).toMatchObject({
			photoUrl: null,
			hasPassword: false,
		});
	});

	it("an unknown account is not found", async () => {
		await expect(setup().getAccount({ userId: "nobody" })).rejects.toThrow(
			CreatorProfileNotFoundError,
		);
	});
});
