import type { GroupFileType } from "@quizio/core/groups/domain/group-file";

import type { AssignSettings, PickedQuiz } from "./group-assign-state";

/** A file as the dialog knows it before and after it is sent. */
export interface ChosenFile {
	type: GroupFileType;
	name: string;
	sizeBytes: number;
}

/** The one thing a post may carry (spec 036, RN-07). */
export type PostAttachment =
	| { kind: "none" }
	| (ChosenFile & {
			kind: "uploading";
			/** Names this upload, so a late answer of a removed one is ignored. */
			token: number;
			progress: number;
			previewUrl: string | null;
	  })
	| (ChosenFile & { kind: "file"; key: string; previewUrl: string | null })
	| { kind: "quiz"; quiz: PickedQuiz; settings: AssignSettings };

/**
 * "Criar publicação" (spec 036, RN-04 to RN-15): the text, the attachment,
 * and the steps of "Atribuir kahoot" ("Selecionar kahoot", then the settings),
 * which come back here.
 */
export interface GroupPostState {
	step: "closed" | "compose" | "select" | "configure";
	message: string;
	attachment: PostAttachment;
	/** The quiz being configured, before "Adicionar à publicação". */
	pickedQuiz: PickedQuiz | null;
	/** Why the last file was refused or failed. */
	error: string | null;
}

export type GroupPostAction =
	| { type: "open" }
	| { type: "close" }
	| { type: "message"; text: string }
	| {
			type: "startUpload";
			token: number;
			file: ChosenFile;
			previewUrl: string | null;
	  }
	| { type: "progress"; token: number; fraction: number }
	| { type: "uploaded"; token: number; key: string }
	| { type: "uploadFailed"; token: number; error: string }
	| { type: "fileRefused"; error: string }
	| { type: "removeAttachment" }
	| { type: "chooseQuiz" }
	| { type: "pickQuiz"; quiz: PickedQuiz }
	| ({ type: "addToPost" } & AssignSettings)
	| { type: "backToCompose" };

export const initialGroupPostState: GroupPostState = {
	step: "closed",
	message: "",
	attachment: { kind: "none" },
	pickedQuiz: null,
	error: null,
};

const NONE: PostAttachment = { kind: "none" };

export function groupPostReducer(
	state: GroupPostState,
	action: GroupPostAction,
): GroupPostState {
	switch (action.type) {
		case "open":
			return { ...initialGroupPostState, step: "compose" };
		case "close":
			return initialGroupPostState;
		case "message":
			return { ...state, message: action.text, error: null };
		case "startUpload":
			return {
				...state,
				error: null,
				attachment: {
					kind: "uploading",
					...action.file,
					token: action.token,
					progress: 0,
					previewUrl: action.previewUrl,
				},
			};
		case "progress":
			return isUpload(state, action.token)
				? {
						...state,
						attachment: { ...state.attachment, progress: action.fraction },
					}
				: state;
		case "uploaded": {
			if (!isUpload(state, action.token)) {
				return state;
			}
			const { token: _token, progress: _progress, ...file } = state.attachment;
			return {
				...state,
				attachment: { ...file, kind: "file", key: action.key },
			};
		}
		case "uploadFailed":
			return isUpload(state, action.token)
				? { ...state, attachment: NONE, error: action.error }
				: state;
		case "fileRefused":
			return { ...state, error: action.error };
		case "removeAttachment":
			return { ...state, attachment: NONE, error: null };
		case "chooseQuiz":
			return { ...state, step: "select", error: null };
		case "pickQuiz":
			return { ...state, step: "configure", pickedQuiz: action.quiz };
		case "addToPost":
			return state.pickedQuiz
				? {
						...state,
						step: "compose",
						pickedQuiz: null,
						attachment: {
							kind: "quiz",
							quiz: state.pickedQuiz,
							settings: { deadline: action.deadline, options: action.options },
						},
					}
				: state;
		case "backToCompose":
			return { ...state, step: "compose", pickedQuiz: null, attachment: NONE };
	}
}

function isUpload(
	state: GroupPostState,
	token: number,
): state is GroupPostState & {
	attachment: Extract<PostAttachment, { kind: "uploading" }>;
} {
	return (
		state.attachment.kind === "uploading" && state.attachment.token === token
	);
}

/** Text or an attachment, and no file still on its way (RN-06). */
export function canPublish(state: GroupPostState): boolean {
	const { attachment } = state;
	if (attachment.kind === "uploading") {
		return false;
	}
	return state.message.trim() !== "" || attachment.kind !== "none";
}

/** The sent file nobody will post, when the dialog drops it (RN-08). */
export function uploadToDiscard(state: GroupPostState): string | null {
	return state.attachment.kind === "file" ? state.attachment.key : null;
}
