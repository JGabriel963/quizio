import { REPORT_NAME_MAX_LENGTH } from "@quizio/core/reports/domain/report";
import { characterCount } from "@quizio/core/shared/domain/text-length";

/**
 * Why a name is not accepted, or null when it is: the same rule the server
 * applies (spec 015, RN-46), told beside the field before anything is sent.
 */
export function reportNameProblem(raw: string): string | null {
	const name = raw.trim();
	if (name === "") {
		return "Dê um nome ao relatório.";
	}
	return characterCount(name) > REPORT_NAME_MAX_LENGTH
		? `O nome deve ter no máximo ${REPORT_NAME_MAX_LENGTH} caracteres.`
		: null;
}

/** What is told when the server did not take the new name (RN-47). */
export const RENAME_FAILED_MESSAGE =
	"Não foi possível renomear o relatório. Tente novamente.";
