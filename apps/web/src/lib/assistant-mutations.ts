import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { useTRPC } from "@/utils/trpc";

import type { GenerationResultData } from "./api-types";
import type { GenerationRequest } from "./assistant-state";
import { uploadFile } from "./upload-file";

/** Sent even offline, so a failure shows instead of a pause (as in the editor). */
const SEND_EVEN_OFFLINE = { networkMode: "always" } as const;

/** Whether the assistant exists here, its quota and the remembered options (spec 027). */
export function useAssistantStatus() {
	const trpc = useTRPC();
	return useQuery({
		...trpc.quiz.assistant.status.queryOptions(),
		// An instance without AI just hides the assistant: no error toast.
		meta: { suppressErrorToast: true },
	});
}

export interface AssistantActions {
	generate: (request: GenerationRequest) => Promise<GenerationResultData>;
	/** Sends the PDF straight to storage and resolves its key (RN-12). */
	uploadSource: (
		file: File,
		onProgress: (fraction: number) => void,
	) => Promise<string>;
	/** Best effort: the 24-hour sweep catches what this misses (RN-18). */
	discardSource: (key: string) => void;
}

export function useAssistantActions(quizId: string): AssistantActions {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const statusKey = trpc.quiz.assistant.status.queryKey();
	const generate = useMutation({
		...trpc.quiz.assistant.generate.mutationOptions(),
		...SEND_EVEN_OFFLINE,
	});
	const requestUpload = useMutation({
		...trpc.media.requestSourceUpload.mutationOptions(),
		...SEND_EVEN_OFFLINE,
	});
	const discard = useMutation(trpc.media.discardSource.mutationOptions());

	return {
		generate: useCallback(
			async (request) => {
				try {
					return await generate.mutateAsync({ quizId, ...request });
				} finally {
					// The quota changed, or a refusal tells why it did not.
					void queryClient.invalidateQueries({ queryKey: statusKey });
				}
			},
			[generate.mutateAsync, queryClient, quizId, statusKey],
		),
		uploadSource: useCallback(
			async (file, onProgress) => {
				const upload = await requestUpload.mutateAsync({
					contentType: file.type || "application/pdf",
					sizeBytes: file.size,
				});
				await uploadFile({ file, upload, onProgress });
				return upload.key;
			},
			[requestUpload.mutateAsync],
		),
		discardSource: useCallback(
			(key) => discard.mutate({ key }),
			[discard.mutate],
		),
	};
}
