import { ACCESS_KEY_NAME_MAX_LENGTH } from "@quizio/core/agents/domain/access-key";

import { formatRelativeTime } from "@/lib/format-relative-time";
import { domainCodeOf } from "@/lib/quiz-error-messages";

const MESSAGES_BY_DOMAIN_CODE: Record<string, string> = {
	"AGENT.KEY_LIMIT":
		"Você chegou ao limite de chaves. Revogue uma para criar outra.",
	"AGENT.INVALID_KEY_NAME": `O nome da chave deve ter de 1 a ${ACCESS_KEY_NAME_MAX_LENGTH} caracteres.`,
};

/** What Agentes de IA tells when the server refuses (spec 044). */
export function agentErrorMessage(error: unknown): string {
	return (
		MESSAGES_BY_DOMAIN_CODE[domainCodeOf(error) ?? ""] ??
		"Não foi possível criar a chave. Tente de novo."
	);
}

const day = new Intl.DateTimeFormat("pt-BR", {
	day: "2-digit",
	month: "2-digit",
	year: "numeric",
});

/** "Último uso há 3 horas", or "Ainda não usado" (spec 044, RN-14, RN-15). */
export function lastUseLabel(
	lastUsedAt: Date | null,
	now = new Date(),
): string {
	return lastUsedAt
		? `Último uso ${formatRelativeTime(lastUsedAt, now)}`
		: "Ainda não usado";
}

/** "Conectado em 28/10/2026" (RN-14). */
export function connectedLabel(connectedAt: Date): string {
	return `Conectado em ${day.format(connectedAt)}`;
}

/** "Criada em 28/10/2026" (RN-15). */
export function createdLabel(createdAt: Date): string {
	return `Criada em ${day.format(createdAt)}`;
}

/** A connection whose agent registered no name and no return address. */
export const UNNAMED_AGENT = "Agente sem nome";
