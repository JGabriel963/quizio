/**
 * Each user's realtime channel for "you have news" (spec 040, RN-11; ADR
 * 0020). Its name cannot be worked out from the user's id, which profiles
 * show in their address.
 */
export interface InboxChannels {
	channelOf(userId: string): string;
}

/** The only event on an inbox channel: a hint, with no data. */
export const INBOX_CHANGED_EVENT = "inbox-changed";
