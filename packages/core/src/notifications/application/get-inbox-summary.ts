import { hasNews } from "../domain/notification";
import type { InboxChannels } from "./ports/inbox-channels";
import type { NotificationInboxRepository } from "./ports/notification-inbox-repository";
import type { NotificationQuery } from "./ports/notification-query";

/** The bell: the red dot and the channel to listen to (spec 040, RN-10, RN-11). */
export interface InboxSummary {
	hasNews: boolean;
	channel: string;
}

export type GetInboxSummary = (input: {
	userId: string;
}) => Promise<InboxSummary>;

export function createGetInboxSummary(deps: {
	notificationQuery: NotificationQuery;
	notificationInbox: NotificationInboxRepository;
	inboxChannels: InboxChannels;
}): GetInboxSummary {
	return async ({ userId }) => {
		const [latestAt, inbox] = await Promise.all([
			deps.notificationQuery.latestAt(userId),
			deps.notificationInbox.find(userId),
		]);
		return {
			hasNews: hasNews(latestAt, inbox.seenAt),
			channel: deps.inboxChannels.channelOf(userId),
		};
	};
}
