import { describe, expect, it } from "vitest";

import { createHmacInboxChannels } from "./hmac-inbox-channels";

describe("HMAC inbox channels (spec 040; ADR 0020)", () => {
	it("the same user gets the same channel", () => {
		const channels = createHmacInboxChannels("pusher-secret");

		expect(channels.channelOf("ana")).toBe(channels.channelOf("ana"));
		expect(channels.channelOf("ana")).toMatch(/^inbox-[0-9a-f]{32}$/);
	});

	it("the channel is not the user id and differs by secret", () => {
		const channel = createHmacInboxChannels("pusher-secret").channelOf("ana");

		expect(channel).not.toContain("ana");
		expect(createHmacInboxChannels("pusher-secret").channelOf("bia")).not.toBe(
			channel,
		);
		expect(createHmacInboxChannels("another-secret").channelOf("ana")).not.toBe(
			channel,
		);
	});
});
