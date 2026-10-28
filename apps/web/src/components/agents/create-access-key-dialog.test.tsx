import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CreateAccessKeyDialog } from "./create-access-key-dialog";

const created = {
	key: {
		id: "k1",
		name: "Script da escola",
		start: "qz_abc123",
		createdAt: "2026-10-28T12:00:00.000Z",
		lastUsedAt: null,
	},
	secret: "qz_abc123-the-whole-secret",
};

describe("CreateAccessKeyDialog (spec 044, RN-05; CA-05, CA-06)", () => {
	it("names the key, then shows it once with Copiar and the warning", async () => {
		const user = userEvent.setup();
		const onCreate = vi.fn(async () => created);
		const onClose = vi.fn();
		render(
			<CreateAccessKeyDialog open onClose={onClose} onCreate={onCreate} />,
		);

		await user.type(screen.getByLabelText("Nome"), "Script da escola");
		await user.click(screen.getByRole("button", { name: "Criar chave" }));

		expect(onCreate).toHaveBeenCalledWith("Script da escola");
		expect(
			screen.getByRole("group", { name: "Sua chave de acesso" }),
		).toHaveTextContent("qz_abc123-the-whole-secret");
		expect(
			screen.getByText("Copie agora: esta chave não será mostrada de novo."),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Copiar" })).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Concluído" }));
		expect(onClose).toHaveBeenCalled();
	});

	it("the name field shows its limit and the server's refusal", async () => {
		const user = userEvent.setup();
		const refusal = Object.assign(new Error("limit"), {
			data: { domainCode: "AGENT.KEY_LIMIT" },
		});
		render(
			<CreateAccessKeyDialog
				open
				onClose={() => {}}
				onCreate={async () => {
					throw refusal;
				}}
			/>,
		);

		expect(screen.getByText("50")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Criar chave" })).toBeDisabled();
		await user.type(screen.getByLabelText("Nome"), "Mais uma");
		await user.click(screen.getByRole("button", { name: "Criar chave" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Você chegou ao limite de chaves. Revogue uma para criar outra.",
		);
	});
});
