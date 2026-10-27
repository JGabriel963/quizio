import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { CreatorProfileData } from "@/lib/api-types";
import { renderWithRouter } from "@/testing/render-with-router";

import { CreatorProfile } from "./creator-profile";

const profile: CreatorProfileData = {
	creator: {
		userId: "ana",
		name: "Ana",
		photoUrl: "https://media.test/profiles/ana/a.webp",
	},
	isOwner: false,
	totals: { quizzes: 1, games: 3, participants: 41 },
	quizzes: [
		{
			quizId: "quiz-1",
			title: "Bom de Bíblia (Geral)",
			coverUrl: null,
			questionCount: 15,
			participants: 41,
		},
	],
};

describe("CreatorProfile (spec 039, RN-27 to RN-33)", () => {
	it("header with photo, name and totals, and the cards", async () => {
		renderWithRouter(<CreatorProfile profile={profile} onCopyLink={vi.fn()} />);

		expect(
			await screen.findByRole("heading", { level: 1, name: "Ana" }),
		).toBeVisible();
		expect(document.querySelector('img[src$="a.webp"]')).not.toBeNull();
		const totals = screen.getByRole("list", { name: "Números do perfil" });
		expect(within(totals).getByText("Quizzes").nextSibling).toHaveTextContent(
			"1",
		);
		expect(within(totals).getByText("Jogos").nextSibling).toHaveTextContent(
			"3",
		);
		expect(
			within(totals).getByText("Participantes").nextSibling,
		).toHaveTextContent("41");

		const card = screen.getByRole("link", { name: /Bom de Bíblia \(Geral\)/ });
		expect(card).toHaveAttribute("href", "/profile/ana/quizzes/quiz-1");
		expect(card).toHaveTextContent("41 participantes");
		expect(card).toHaveTextContent("15 perguntas");
		expect(card).toHaveTextContent("Ana");
	});

	it("the owner's card opens the quiz's own page", async () => {
		renderWithRouter(
			<CreatorProfile
				profile={{ ...profile, isOwner: true }}
				onCopyLink={vi.fn()}
			/>,
		);

		expect(
			await screen.findByRole("link", { name: /Bom de Bíblia \(Geral\)/ }),
		).toHaveAttribute("href", "/quizzes/quiz-1");
	});

	it("empty texts for the owner and a visitor", async () => {
		const empty = {
			...profile,
			totals: { quizzes: 0, games: 0, participants: 0 },
			quizzes: [],
		};
		const { unmount } = renderWithRouter(
			<CreatorProfile
				profile={{ ...empty, isOwner: true }}
				onCopyLink={vi.fn()}
			/>,
		);
		expect(
			await screen.findByText(
				"Você ainda não tem quizzes públicos. Mude a visibilidade de um quiz para Público para que ele apareça aqui.",
			),
		).toBeVisible();
		unmount();

		renderWithRouter(<CreatorProfile profile={empty} onCopyLink={vi.fn()} />);
		expect(
			await screen.findByText("Ana ainda não tem quizzes públicos."),
		).toBeVisible();
	});

	it("Opções de perfil by role, Copiar link goes up", async () => {
		const user = userEvent.setup();
		const onCopyLink = vi.fn();
		const { unmount } = renderWithRouter(
			<CreatorProfile profile={profile} onCopyLink={onCopyLink} />,
		);

		await user.click(
			await screen.findByRole("button", { name: "Opções de perfil" }),
		);
		expect(
			(await screen.findAllByRole("menuitem")).map((item) => item.textContent),
		).toEqual(["Copiar link do perfil"]);
		await user.click(
			screen.getByRole("menuitem", { name: "Copiar link do perfil" }),
		);
		expect(onCopyLink).toHaveBeenCalledOnce();
		unmount();

		renderWithRouter(
			<CreatorProfile
				profile={{ ...profile, isOwner: true }}
				onCopyLink={onCopyLink}
			/>,
		);
		await user.click(
			await screen.findByRole("button", { name: "Opções de perfil" }),
		);
		const editProfile = await screen.findByRole("menuitem", {
			name: "Editar perfil",
		});
		expect(editProfile).toHaveAttribute("href", "/settings?section=profile");
	});
});
