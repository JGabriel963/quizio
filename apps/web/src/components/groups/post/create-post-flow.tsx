import type { GroupFileType } from "@quizio/core/groups/domain/group-file";
import { useEffect, useReducer, useRef, useState } from "react";

import type { AssignmentSetupData } from "@/components/assignment/assign-dialog";
import type { GroupAssignInput } from "@/components/groups/assign/assign-in-group-flow";
import { AssignmentSettingsDialog } from "@/components/groups/assign/assignment-settings-dialog";
import { SelectQuizDialog } from "@/components/groups/assign/select-quiz-dialog";
import type { LibraryItemView } from "@/lib/api-types";
import { assignmentErrorMessage } from "@/lib/assignment-error-messages";
import { groupErrorMessage } from "@/lib/group-error-messages";
import { checkGroupFile } from "@/lib/group-post-labels";
import {
	canPublish,
	groupPostReducer,
	initialGroupPostState,
	uploadToDiscard,
} from "@/lib/group-post-state";

import { CreatePostDialog } from "./create-post-dialog";

/** Sends a chosen file to storage and names it (spec 036; ADR 0017). */
export type GroupFileUploader = (
	type: GroupFileType,
	file: File,
	onProgress: (fraction: number) => void,
) => Promise<{ key: string }>;

const UPLOAD_FAILED: Record<GroupFileType, string> = {
	image: "Não foi possível enviar a imagem.",
	pdf: "Não foi possível enviar o arquivo.",
};

const previewOf = (file: File) =>
	typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : null;
const revoke = (url: string | null) => {
	if (url && typeof URL.revokeObjectURL === "function") {
		URL.revokeObjectURL(url);
	}
};

/**
 * "Criar publicação" and its "Atribuir kahoot" (spec 036): the dialog, the
 * files sent as they are chosen, and "Selecionar kahoot" with the settings,
 * which come back to the post. A post with a quiz is an assignment of spec
 * 038; any other goes to `onPost`. A file nobody posts is discarded.
 */
export function CreatePostFlow({
	open,
	canAssign,
	canShare,
	sharedIds,
	quizzes,
	ownerName,
	setup,
	onUpload,
	onDiscardUpload,
	onPost,
	onAssign,
	onShare,
	onClose,
}: {
	open: boolean;
	canAssign: boolean;
	canShare: boolean;
	/** The group's quizzes, "Já compartilhado" in the list (spec 037, RN-04). */
	sharedIds: readonly string[];
	quizzes: readonly LibraryItemView[] | undefined;
	ownerName: string;
	setup: AssignmentSetupData | undefined;
	onUpload: GroupFileUploader;
	onDiscardUpload: (key: string) => void;
	onPost: (input: { message: string; uploadKey?: string }) => Promise<unknown>;
	onAssign: (input: GroupAssignInput) => Promise<unknown>;
	onShare: (input: { quizIds: string[]; message: string }) => Promise<unknown>;
	onClose: () => void;
}) {
	const [state, dispatch] = useReducer(groupPostReducer, initialGroupPostState);
	const [publishing, setPublishing] = useState(false);
	const [publishError, setPublishError] = useState<string | null>(null);
	// When "Atribuir kahoot" was chosen: the default deadline counts from then.
	const [assigningSince, setAssigningSince] = useState(() => new Date());
	// The upload the dialog still waits for; any other answer is dropped.
	const currentUpload = useRef<number | null>(null);
	const nextToken = useRef(0);

	useEffect(() => {
		dispatch({ type: open ? "open" : "close" });
		setPublishError(null);
		setPublishing(false);
	}, [open]);

	const previewUrl =
		state.attachment.kind === "uploading" || state.attachment.kind === "file"
			? state.attachment.previewUrl
			: null;

	function dropAttachment() {
		currentUpload.current = null;
		const key = uploadToDiscard(state);
		if (key) {
			onDiscardUpload(key);
		}
		revoke(previewUrl);
	}

	function cancel() {
		dropAttachment();
		dispatch({ type: "close" });
		onClose();
	}

	async function pickFile(type: GroupFileType, file: File) {
		const refusal = checkGroupFile(file, type);
		if (refusal) {
			dispatch({ type: "fileRefused", error: refusal });
			return;
		}
		nextToken.current += 1;
		const token = nextToken.current;
		currentUpload.current = token;
		dispatch({
			type: "startUpload",
			token,
			file: { type, name: file.name, sizeBytes: file.size },
			previewUrl: type === "image" ? previewOf(file) : null,
		});
		try {
			const { key } = await onUpload(type, file, (fraction) =>
				dispatch({ type: "progress", token, fraction }),
			);
			if (currentUpload.current === token) {
				dispatch({ type: "uploaded", token, key });
			} else {
				// Removed or closed while it was on its way.
				onDiscardUpload(key);
			}
		} catch (error) {
			dispatch({
				type: "uploadFailed",
				token,
				error: groupErrorMessage(error, UPLOAD_FAILED[type]),
			});
		}
	}

	async function publish() {
		if (!canPublish(state) || publishing) {
			return;
		}
		setPublishing(true);
		setPublishError(null);
		const { attachment, message } = state;
		try {
			if (attachment.kind === "sharedQuiz") {
				await onShare({ quizIds: [attachment.quiz.id], message });
			} else if (attachment.kind === "quiz") {
				await onAssign({
					quizId: attachment.quiz.id,
					...attachment.settings,
					message,
				});
			} else {
				await onPost({
					message,
					uploadKey: attachment.kind === "file" ? attachment.key : undefined,
				});
			}
			revoke(previewUrl);
			currentUpload.current = null;
			dispatch({ type: "close" });
			onClose();
		} catch (failure) {
			setPublishError(
				groupErrorMessage(failure, "") ||
					assignmentErrorMessage(
						failure,
						"Não foi possível publicar. Tente novamente.",
					),
			);
			setPublishing(false);
		}
	}

	return (
		<>
			<CreatePostDialog
				open={state.step === "compose"}
				message={state.message}
				attachment={state.attachment}
				canAssign={canAssign}
				canPublish={canPublish(state)}
				publishing={publishing}
				error={state.error ?? publishError}
				onMessageChange={(text) => {
					setPublishError(null);
					dispatch({ type: "message", text });
				}}
				onPickFile={(type, file) => void pickFile(type, file)}
				canShare={canShare}
				onAssign={() => {
					setAssigningSince(new Date());
					dispatch({ type: "chooseQuiz" });
				}}
				onShare={() => dispatch({ type: "chooseQuizToShare" })}
				onRemoveAttachment={() => {
					dropAttachment();
					dispatch({ type: "removeAttachment" });
				}}
				onCancel={cancel}
				onPublish={() => void publish()}
			/>
			{(canAssign || canShare) && (
				<SelectQuizDialog
					open={state.step === "select"}
					quizzes={quizzes}
					ownerName={ownerName}
					purpose={state.purpose}
					sharedIds={state.purpose === "share" ? sharedIds : []}
					onPick={(quiz) => dispatch({ type: "pickQuiz", quiz })}
					onClose={() => dispatch({ type: "backToCompose" })}
				/>
			)}
			{state.step === "configure" && state.pickedQuiz && (
				<AssignmentSettingsDialog
					open
					variant="post"
					setup={setup}
					now={assigningSince}
					onAddMessage={(settings) =>
						dispatch({ type: "addToPost", ...settings })
					}
					onClose={() => dispatch({ type: "backToCompose" })}
				/>
			)}
		</>
	);
}
