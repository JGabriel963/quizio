import { createHmac } from "node:crypto";

import type { InboxChannels } from "@quizio/core/notifications/application/ports/inbox-channels";

/**
 * Each user's inbox channel (spec 040; ADR 0020): an HMAC of the account's
 * id with a server secret, so a profile's address, which shows the id, does
 * not tell anyone the channel. Server only.
 */
export function createHmacInboxChannels(secret: string): InboxChannels {
	return {
		channelOf(userId) {
			const digest = createHmac("sha256", secret)
				.update(`inbox:${userId}`)
				.digest("hex");
			return `inbox-${digest.slice(0, 32)}`;
		},
	};
}
