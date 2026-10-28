import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AccessKeysCard } from "./access-keys-card";

const now = new Date("2026-10-28T12:00:00.000Z");
const key = (index: number) => ({
	id: `k${index}`,
	name: `Chave ${index}`,
	start: "qz_abc123",
	createdAt: "2026-10-27T12:00:00.000Z",
	lastUsedAt: null,
});

const props = {
	now,
	keyLimit: 20,
	onCreateKey: async () => ({ key: key(99), secret: "qz_abc123secret" }),
	onRevokeKey: async () => {},
};

describe("AccessKeysCard (spec 044, RN-05, RN-15; CA-05, CA-06)", () => {
	it("lists each key by its name and start, never the secret", () => {
		render(<AccessKeysCard keys={[key(1)]} {...props} />);

		expect(screen.getByText("Chave 1")).toBeInTheDocument();
		expect(screen.getByText("qz_abc123…")).toBeInTheDocument();
		expect(screen.getByText("Ainda não usado")).toBeInTheDocument();
		expect(screen.getByText(/^Criada em /)).toBeInTheDocument();
	});

	it("Criar chave is unavailable at 20 with the limit text", () => {
		render(
			<AccessKeysCard
				keys={Array.from({ length: 20 }, (_, i) => key(i))}
				{...props}
			/>,
		);

		expect(screen.getByRole("button", { name: "Criar chave" })).toBeDisabled();
		expect(
			screen.getByText(
				"Você chegou ao limite de 20 chaves. Revogue uma para criar outra.",
			),
		).toBeInTheDocument();
	});

	it("Revogar asks first", async () => {
		const user = userEvent.setup();
		const onRevokeKey = vi.fn(async () => {});
		render(
			<AccessKeysCard keys={[key(1)]} {...props} onRevokeKey={onRevokeKey} />,
		);

		await user.click(screen.getByRole("button", { name: "Revogar Chave 1" }));
		expect(screen.getByRole("alertdialog")).toHaveTextContent(
			"Revogar Chave 1?",
		);
		await user.click(screen.getByRole("button", { name: "Revogar" }));

		expect(onRevokeKey).toHaveBeenCalledWith("k1");
	});
});
