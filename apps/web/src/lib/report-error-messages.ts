import { REPORT_NAME_MAX_LENGTH } from "@quizio/core/reports/domain/report";

import { domainCodeOf } from "./quiz-error-messages";

const MESSAGES_BY_DOMAIN_CODE: Record<string, string> = {
	"REPORT.NOT_FOUND": "Relatório não encontrado.",
	"REPORT.IN_TRASH":
		"Este relatório está na lixeira. Restaure-o antes de abrir.",
	"REPORT.NOT_IN_TRASH": "Mova o relatório para a lixeira antes de excluí-lo.",
	"REPORT.INVALID_NAME": `O nome deve ter de 1 a ${REPORT_NAME_MAX_LENGTH} caracteres.`,
};

/** Portuguese message for a failed report call, based on its domain code. */
export function reportErrorMessage(
	error: unknown,
	fallback = "Não foi possível concluir. Tente novamente.",
): string {
	const domainCode = domainCodeOf(error);
	return (domainCode && MESSAGES_BY_DOMAIN_CODE[domainCode]) ?? fallback;
}

/** The report exists but sits in the trash (spec 015, RN-51). */
export function isReportInTrash(error: unknown): boolean {
	return domainCodeOf(error) === "REPORT.IN_TRASH";
}

export function isReportNotFound(error: unknown): boolean {
	return domainCodeOf(error) === "REPORT.NOT_FOUND";
}
