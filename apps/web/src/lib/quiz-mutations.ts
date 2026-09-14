import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useTRPC, useTRPCClient } from "@/utils/trpc";

import { quizErrorMessage } from "./quiz-error-messages";
import { uploadFile } from "./upload-file";

function useInvalidateQuizzes() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	return () =>
		Promise.all([
			queryClient.invalidateQueries({ queryKey: trpc.library.list.pathKey() }),
			queryClient.invalidateQueries({ queryKey: trpc.quiz.get.pathKey() }),
		]);
}

const showError = (error: unknown) => {
	toast.error(quizErrorMessage(error));
};

/** Quiz mutations that keep the library and details pages in sync. */
export function useQuizMutations() {
	const trpc = useTRPC();
	const invalidate = useInvalidateQuizzes();

	const create = useMutation(
		trpc.quiz.create.mutationOptions({ onSuccess: invalidate }),
	);
	const updateDetails = useMutation(
		trpc.quiz.updateDetails.mutationOptions({ onSuccess: invalidate }),
	);
	const duplicate = useMutation(
		trpc.quiz.duplicate.mutationOptions({
			onSuccess: () => {
				toast.success("Quiz duplicado.");
				return invalidate();
			},
			onError: showError,
		}),
	);
	const restore = useMutation(
		trpc.quiz.restore.mutationOptions({
			onSuccess: invalidate,
			onError: showError,
		}),
	);
	const moveToTrash = useMutation(
		trpc.quiz.moveToTrash.mutationOptions({
			onSuccess: (_, variables) => {
				// Deleting is reversible, so offer an undo instead of a confirmation (spec 001, CA-23).
				toast("Quiz movido para a lixeira.", {
					action: {
						label: "Desfazer",
						onClick: () => restore.mutate(variables),
					},
				});
				return invalidate();
			},
			onError: showError,
		}),
	);
	const deletePermanently = useMutation(
		trpc.quiz.deletePermanently.mutationOptions({
			onSuccess: () => {
				toast.success("Quiz excluído definitivamente.");
				return invalidate();
			},
			onError: showError,
		}),
	);

	return {
		create,
		updateDetails,
		duplicate,
		moveToTrash,
		restore,
		deletePermanently,
	};
}

/** Requests a presigned URL and uploads the cover straight to storage. */
export function useUploadCover() {
	const trpcClient = useTRPCClient();
	return async (file: File, onProgress: (fraction: number) => void) => {
		const upload = await trpcClient.media.requestUpload.mutate({
			contentType: file.type,
			sizeBytes: file.size,
		});
		await uploadFile({ file, upload, onProgress });
		return { key: upload.key, url: upload.publicUrl };
	};
}
