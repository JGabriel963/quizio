import type { InviteCodeGenerator } from "../application/ports/invite-code-generator";

/** `invite-1`, `invite-2`… */
export class SequentialInviteCodeGenerator implements InviteCodeGenerator {
	#next = 1;

	generate(): string {
		return `invite-${this.#next++}`;
	}
}
