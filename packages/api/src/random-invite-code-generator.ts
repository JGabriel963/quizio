import { randomBytes } from "node:crypto";

import type { InviteCodeGenerator } from "@quizio/core/groups/application/ports/invite-code-generator";

/** 128 random bits in base64url: a link nobody guesses (spec 034, RN-23). */
export function createRandomInviteCodeGenerator(): InviteCodeGenerator {
	return { generate: () => randomBytes(16).toString("base64url") };
}
