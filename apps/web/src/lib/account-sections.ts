/**
 * The sections of Configurações, in the column's order (spec 039, RN-03;
 * spec 044, RN-12: Agentes de IA between Acesso à IA and Senha).
 */
export const ACCOUNT_SECTIONS = [
	"profile",
	"ai",
	"agents",
	"password",
	"delete",
] as const;

export type AccountSection = (typeof ACCOUNT_SECTIONS)[number];

export const ACCOUNT_SECTION_LABELS: Record<AccountSection, string> = {
	profile: "Seu perfil",
	ai: "Acesso à IA",
	agents: "Agentes de IA",
	password: "Senha",
	delete: "Exclusão de conta",
};

/** An unknown or missing section opens Seu perfil. */
export function accountSectionOf(value: unknown): AccountSection {
	return ACCOUNT_SECTIONS.find((section) => section === value) ?? "profile";
}
