import { describe, expect, it } from "vitest";

import {
	initialPhotoState,
	type PhotoState,
	photoReducer,
} from "./profile-photo-state";

const file = new File(["x"], "me.png", { type: "image/png" });

describe("photoReducer (spec 039, RN-07 to RN-10)", () => {
	it("empty → cropping → uploading → done or error, cancel back to cropping", () => {
		let state: PhotoState = initialPhotoState;
		expect(state).toEqual({ kind: "empty", error: null });

		state = photoReducer(state, { type: "chosen", file, previewUrl: "blob:1" });
		expect(state).toMatchObject({
			kind: "cropping",
			file,
			previewUrl: "blob:1",
			crop: { shape: "circle", zoom: 1, x: 0.5, y: 0.5 },
		});

		state = photoReducer(state, { type: "zoomed", zoom: 2 });
		expect(state).toMatchObject({ kind: "cropping", crop: { zoom: 2 } });

		state = photoReducer(state, { type: "uploadStarted" });
		expect(state).toMatchObject({ kind: "uploading", progress: 0 });

		state = photoReducer(state, { type: "progressed", progress: 0.6 });
		expect(state).toMatchObject({ kind: "uploading", progress: 0.6 });

		const cancelled = photoReducer(state, { type: "uploadCancelled" });
		expect(cancelled).toMatchObject({
			kind: "cropping",
			file,
			crop: { zoom: 2 },
			error: null,
		});

		const failed = photoReducer(state, { type: "uploadFailed" });
		expect(failed).toMatchObject({
			kind: "cropping",
			crop: { zoom: 2 },
			error: "Não foi possível carregar a imagem.",
		});
	});

	it("a refused file keeps the dialog where it was, with the policy message", () => {
		const state = photoReducer(initialPhotoState, { type: "refused" });

		expect(state).toEqual({
			kind: "empty",
			error: "Use uma imagem JPEG, PNG, GIF ou WebP de até 10 MB.",
		});
	});

	it("zoom stays between the limits", () => {
		const cropping = photoReducer(initialPhotoState, {
			type: "chosen",
			file,
			previewUrl: "blob:1",
		});

		expect(photoReducer(cropping, { type: "zoomed", zoom: 99 })).toMatchObject({
			crop: { zoom: 3 },
		});
		expect(photoReducer(cropping, { type: "zoomed", zoom: 0 })).toMatchObject({
			crop: { zoom: 1 },
		});
	});
});
