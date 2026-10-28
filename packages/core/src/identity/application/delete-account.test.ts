import { beforeEach, describe, expect, it } from "vitest";

import { FixedClock } from "../../shared/testing/fixed-clock";
import { InMemoryAttemptLimiter } from "../../shared/testing/in-memory-attempt-limiter";
import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { SequentialIdGenerator } from "../../shared/testing/sequential-id-generator";
import {
	EmailMismatchError,
	TooManyAttemptsError,
	WrongPasswordError,
} from "../domain/account-errors";
import { FakeAccountClosure } from "../testing/fake-account-closure";
import { FakeAccountCredentials } from "../testing/fake-account-credentials";
import { InMemoryAccountDeletionFeedback } from "../testing/in-memory-account-deletion-feedback";
import { InMemoryAccountRepository } from "../testing/in-memory-account-repository";
import { createDeleteAccount, type DeleteAccount } from "./delete-account";

describe("deleteAccount (spec 039)", () => {
	let accounts: InMemoryAccountRepository;
	let credentials: FakeAccountCredentials;
	let closure: FakeAccountClosure;
	let feedback: InMemoryAccountDeletionFeedback;
	let storage: InMemoryObjectStorage;
	let deleteAccount: DeleteAccount;

	const withPassword = (password: string) => ({
		userId: "ana",
		reason: "notUsing",
		feedback: "  Obrigada  ",
		confirmation: { kind: "password" as const, password },
	});

	beforeEach(() => {
		accounts = new InMemoryAccountRepository();
		credentials = new FakeAccountCredentials();
		closure = new FakeAccountClosure();
		feedback = new InMemoryAccountDeletionFeedback();
		storage = new InMemoryObjectStorage();
		deleteAccount = createDeleteAccount({
			accounts,
			credentials,
			accountClosure: closure,
			deletionFeedback: feedback,
			attempts: new InMemoryAttemptLimiter(),
			storage,
			ids: new SequentialIdGenerator("feedback"),
			clock: new FixedClock("2026-10-27T12:00:00.000Z"),
		});
		accounts.add({ id: "ana", name: "Ana", email: "ana@quizio.test" });
		accounts.add({ id: "bia", name: "Bia", email: "bia@gmail.test" });
		credentials.setPassword("ana", "segredo-123");
	});

	it("a wrong password is WRONG_PASSWORD and the account stays", async () => {
		await expect(deleteAccount(withPassword("errada"))).rejects.toThrow(
			WrongPasswordError,
		);

		expect(await accounts.find("ana")).not.toBeNull();
		expect(closure.calls).toEqual([]);
		expect(feedback.entries).toEqual([]);
	});

	it("the sixth wrong password in 60 s is TOO_MANY_ATTEMPTS", async () => {
		for (let attempt = 0; attempt < 5; attempt++) {
			await expect(deleteAccount(withPassword("errada"))).rejects.toThrow(
				WrongPasswordError,
			);
		}

		await expect(deleteAccount(withPassword("segredo-123"))).rejects.toThrow(
			TooManyAttemptsError,
		);
		expect(await accounts.find("ana")).not.toBeNull();
	});

	it("a Google-only account confirms with its email, another email is EMAIL_MISMATCH", async () => {
		await expect(
			deleteAccount({
				userId: "bia",
				reason: "other",
				confirmation: { kind: "email", email: "ana@quizio.test" },
			}),
		).rejects.toThrow(EmailMismatchError);

		await deleteAccount({
			userId: "bia",
			reason: "other",
			confirmation: { kind: "email", email: "  BIA@gmail.test " },
		});

		expect(await accounts.find("bia")).toBeNull();
	});

	it("an account with a password cannot confirm with the email", async () => {
		await expect(
			deleteAccount({
				userId: "ana",
				reason: "other",
				confirmation: { kind: "email", email: "ana@quizio.test" },
			}),
		).rejects.toThrow(WrongPasswordError);
	});

	it("stores the reason and the feedback without the user", async () => {
		await deleteAccount(withPassword("segredo-123"));

		expect(feedback.entries).toEqual([
			{
				id: "feedback-1",
				reason: "notUsing",
				feedback: "Obrigada",
				at: new Date("2026-10-27T12:00:00.000Z"),
			},
		]);
	});

	it("ends games, deletes managed groups, deletes the account, then the files", async () => {
		await deleteAccount(withPassword("segredo-123"));

		expect(closure.calls).toEqual([
			"endGames:ana",
			"deleteManagedGroups:ana",
			"groupFileKeys:ana",
		]);
		expect(await accounts.find("ana")).toBeNull();
	});

	it("deletes the group files and the media, sources, profiles and themes prefixes (spec 043, RN-30)", async () => {
		for (const key of [
			"media/ana/cover.png",
			"themes/ana/logo.png",
			"themes/anabela/keep.png",
			"sources/ana/a.pdf",
			"profiles/ana/me.webp",
			"groups/g2/post.pdf",
			"groups/g2/other.pdf",
			"media/anabela/keep.png",
		]) {
			storage.simulateUpload(key);
		}
		closure.setGroupFileKeys("ana", ["groups/g2/post.pdf"]);

		await deleteAccount(withPassword("segredo-123"));

		expect(storage.keys().sort()).toEqual([
			"groups/g2/other.pdf",
			"media/anabela/keep.png",
			"themes/anabela/keep.png",
		]);
	});
});
