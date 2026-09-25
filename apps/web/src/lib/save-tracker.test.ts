import { describe, expect, it } from "vitest";

import { createSaveTracker } from "./save-tracker";

function deferred() {
	let resolve!: () => void;
	let reject!: (error: Error) => void;
	const promise = new Promise<void>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

describe("createSaveTracker", () => {
	it("reports saving while an operation is pending and saved after", async () => {
		const tracker = createSaveTracker();
		const statuses: string[] = [];
		tracker.subscribe(() => statuses.push(tracker.getStatus()));
		const save = deferred();

		expect(tracker.getStatus()).toBe("saved");
		const tracked = tracker.track("question:a:text", () => save.promise);
		expect(tracker.getStatus()).toBe("saving");
		save.resolve();
		await tracked;

		expect(tracker.getStatus()).toBe("saved");
		expect(statuses).toEqual(["saving", "saved"]);
	});

	it("reports saving while a change waits to be sent", () => {
		const tracker = createSaveTracker();

		tracker.markPending("question:a:text");
		expect(tracker.getStatus()).toBe("saving");
		tracker.clearPending("question:a:text");

		expect(tracker.getStatus()).toBe("saved");
	});

	it("keeps only the latest failed operation per key", async () => {
		const tracker = createSaveTracker();
		const sent: string[] = [];
		const failing = (value: string) => async () => {
			sent.push(value);
			throw new Error("offline");
		};

		await tracker.track("question:a:text", failing("Per"));
		await tracker.track("question:a:text", failing("Pergunta"));

		expect(tracker.getStatus()).toBe("failed");
		expect(tracker.failedCount()).toBe(1);
	});

	it("retry resends failed operations and returns to saved", async () => {
		const tracker = createSaveTracker();
		let online = false;
		const sent: string[] = [];
		await tracker.track("question:a:text", async () => {
			if (!online) {
				throw new Error("offline");
			}
			sent.push("Pergunta nova");
		});

		online = true;
		await tracker.retry();

		expect(sent).toEqual(["Pergunta nova"]);
		expect(tracker.getStatus()).toBe("saved");
	});

	it("does not keep failures of operations that cannot be retried", async () => {
		const tracker = createSaveTracker();

		const ok = await tracker.track(
			"structure",
			async () => {
				throw new Error("refused");
			},
			{ retryable: false },
		);

		expect(ok).toBe(false);
		expect(tracker.getStatus()).toBe("saved");
	});

	it("flush resolves true when everything saved and false when something failed", async () => {
		const tracker = createSaveTracker();
		const sent: string[] = [];
		// A debounced field registers how to send its pending value.
		tracker.registerFlusher(async () => {
			await tracker.track("quiz:title", async () => {
				sent.push("Geografia");
			});
		});

		expect(await tracker.flush()).toBe(true);
		expect(sent).toEqual(["Geografia"]);

		await tracker.track("question:a:text", async () => {
			throw new Error("offline");
		});
		expect(await tracker.flush()).toBe(false);
	});

	it("flush waits for operations already in flight", async () => {
		const tracker = createSaveTracker();
		const save = deferred();
		let done = false;
		void tracker.track("question:a:text", async () => {
			await save.promise;
			done = true;
		});

		const flushed = tracker.flush();
		save.resolve();

		expect(await flushed).toBe(true);
		expect(done).toBe(true);
	});
});
