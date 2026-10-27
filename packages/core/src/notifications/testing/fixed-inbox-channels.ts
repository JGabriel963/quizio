import type { InboxChannels } from "../application/ports/inbox-channels";

/** Readable channel names for tests; the real ones are an HMAC (ADR 0020). */
export class FixedInboxChannels implements InboxChannels {
	channelOf(userId: string): string {
		return `inbox-${userId}`;
	}
}
