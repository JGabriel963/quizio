import { describe, expect, it } from "vitest";

import { connectTestClient } from "../testing/connect-test-client";

describe("account tools (spec 044, RN-19)", () => {
	it("get_account gives name, email and the assistant's quota", async () => {
		const { api, ok } = await connectTestClient({ userId: "ana" });
		api.accounts.add({ id: "ana", name: "Ana", email: "ana@quizio.test" });

		const account = await ok("get_account");

		expect(account).toMatchObject({
			account: { userId: "ana", name: "Ana", email: "ana@quizio.test" },
			aiAssistant: { enabled: true, limit: 20, used: 0 },
			links: { agentsSettings: "https://quizio.test/settings?section=agents" },
		});
	});

	it("rename_account follows the sign-up rules", async () => {
		const { api, ok, call } = await connectTestClient({ userId: "ana" });
		api.accounts.add({ id: "ana", name: "Ana", email: "ana@quizio.test" });

		const renamed = await ok("rename_account", { name: " Ana Souza " });
		const tooShort = await call("rename_account", { name: "A" });

		expect(renamed).toMatchObject({ account: { name: "Ana Souza" } });
		expect(tooShort).toMatchObject({
			isError: true,
			data: { error: { code: "IDENTITY.INVALID_NAME" } },
		});
	});
});
