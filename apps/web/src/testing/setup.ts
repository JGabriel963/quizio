import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { MotionGlobalConfig } from "motion/react";
import { afterEach } from "vitest";

// jsdom draws nothing: every animation goes straight to its end (spec 011).
MotionGlobalConfig.skipAnimations = true;

// What ProseMirror (the statement's editor, spec 047) asks of the browser
// that jsdom does not have: a paste event, and the boxes it measures to
// scroll the cursor into view.
// (Files that run in Node, with no DOM, skip this.)
if (typeof document !== "undefined") {
	if (typeof globalThis.ClipboardEvent === "undefined") {
		globalThis.ClipboardEvent = class extends Event {
			readonly clipboardData: DataTransfer | null = null;
		} as unknown as typeof ClipboardEvent;
	}
	const noBox = () => new DOMRect(0, 0, 0, 0);
	const noBoxes = () =>
		Object.assign([], { item: () => null }) as unknown as DOMRectList;
	Range.prototype.getBoundingClientRect ??= noBox;
	Range.prototype.getClientRects ??= noBoxes;
	document.elementFromPoint ??= () => null;
}

// Vitest globals are off, so Testing Library cannot register its own cleanup.
afterEach(() => {
	cleanup();
});
