import { DomainError } from "@quizio/core/shared/domain/domain-error";

/**
 * Fields that must go together, or one of which must come, beyond what the
 * schema can say: refused as any rule is, with a code (spec 044, RN-11).
 */
export class ToolInputError extends DomainError {
	readonly code = "INVALID_INPUT";
}
