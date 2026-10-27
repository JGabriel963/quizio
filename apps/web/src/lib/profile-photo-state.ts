import {
	defaultCrop,
	type ImageCrop,
} from "@quizio/core/quiz/domain/question-image";

import { clampZoom } from "@/lib/image-crop";

export const PHOTO_POLICY_MESSAGE =
	"Use uma imagem JPEG, PNG, GIF ou WebP de até 10 MB.";
export const PHOTO_UPLOAD_FAILED_MESSAGE =
	"Não foi possível carregar a imagem.";

/**
 * The "Carregar imagem" dialog (spec 039, RN-07 to RN-10): nothing chosen,
 * the round crop over the chosen image, or the upload going on. The effects
 * (reading the file, cropping, uploading) live in the component.
 */
export type PhotoState =
	| { kind: "empty"; error: string | null }
	| {
			kind: "cropping";
			file: File;
			previewUrl: string;
			crop: ImageCrop;
			error: string | null;
	  }
	| {
			kind: "uploading";
			file: File;
			previewUrl: string;
			crop: ImageCrop;
			progress: number;
	  };

export type PhotoAction =
	| { type: "chosen"; file: File; previewUrl: string }
	| { type: "refused" }
	| { type: "zoomed"; zoom: number }
	| { type: "moved"; crop: ImageCrop }
	| { type: "uploadStarted" }
	| { type: "progressed"; progress: number }
	| { type: "uploadCancelled" }
	| { type: "uploadFailed" };

export const initialPhotoState: PhotoState = { kind: "empty", error: null };

export function photoReducer(
	state: PhotoState,
	action: PhotoAction,
): PhotoState {
	switch (action.type) {
		case "chosen":
			// Centered, at the smallest zoom that covers the circle (RN-09).
			return {
				kind: "cropping",
				file: action.file,
				previewUrl: action.previewUrl,
				crop: defaultCrop("circle"),
				error: null,
			};
		case "refused":
			return state.kind === "uploading"
				? state
				: { ...state, error: PHOTO_POLICY_MESSAGE };
		case "zoomed":
			return state.kind === "cropping"
				? {
						...state,
						crop: { ...state.crop, zoom: clampZoom(action.zoom) },
					}
				: state;
		case "moved":
			return state.kind === "cropping"
				? { ...state, crop: action.crop }
				: state;
		case "uploadStarted":
			return state.kind === "cropping"
				? {
						kind: "uploading",
						file: state.file,
						previewUrl: state.previewUrl,
						crop: state.crop,
						progress: 0,
					}
				: state;
		case "progressed":
			return state.kind === "uploading"
				? { ...state, progress: action.progress }
				: state;
		case "uploadCancelled":
		case "uploadFailed":
			if (state.kind !== "uploading") {
				return state;
			}
			// The chosen image stays, to try again (RN-10).
			return {
				kind: "cropping",
				file: state.file,
				previewUrl: state.previewUrl,
				crop: state.crop,
				error:
					action.type === "uploadFailed" ? PHOTO_UPLOAD_FAILED_MESSAGE : null,
			};
	}
}
