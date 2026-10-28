import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { EditorThemes } from "@/components/editor/quiz-editor";
import { useTRPC } from "@/utils/trpc";

import { measureImageTone } from "./image-tone";
import { cropImage } from "./theme-image-crop";
import { uploadFile } from "./upload-file";

/**
 * "Seus temas" wired to the server (spec 043): the list, "Crie seu tema"'s
 * uploads and save, and Excluir. A saved or deleted theme refreshes the list
 * and the editor, whose canvas may wear it (RN-18, RN-19).
 */
export function useEditorThemes(quizId: string): EditorThemes {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const list = useQuery({
		...trpc.theme.list.queryOptions(),
		meta: { suppressErrorToast: true },
	});
	const requestUpload = useMutation(trpc.theme.requestUpload.mutationOptions());
	const discardUpload = useMutation(trpc.theme.discardUpload.mutationOptions());
	const create = useMutation(trpc.theme.create.mutationOptions());
	const update = useMutation(trpc.theme.update.mutationOptions());
	const remove = useMutation(trpc.theme.delete.mutationOptions());

	const refresh = () =>
		Promise.all([
			queryClient.invalidateQueries({ queryKey: trpc.theme.list.queryKey() }),
			queryClient.invalidateQueries({
				queryKey: trpc.quiz.editor.queryKey({ quizId }),
			}),
		]);

	return {
		list: list.data ?? [],
		dialog: {
			upload: async (file, onProgress) => {
				const upload = await requestUpload.mutateAsync({
					contentType: file.type,
					sizeBytes: file.size,
				});
				await uploadFile({ file, upload, onProgress });
				return { key: upload.key, url: URL.createObjectURL(file) };
			},
			discardUploads: (keys) => {
				for (const key of keys) {
					discardUpload.mutate({ key });
				}
			},
			measureTone: measureImageTone,
			crop: cropImage,
			save: async ({ themeId, name, look }) => {
				const saved = themeId
					? await update.mutateAsync({ themeId, name, look })
					: await create.mutateAsync({ name, look });
				void refresh();
				return saved;
			},
		},
		deleteTheme: async (themeId) => {
			try {
				await remove.mutateAsync({ themeId });
				void refresh();
				return true;
			} catch {
				toast.error("Não foi possível excluir o tema.");
				return false;
			}
		},
	};
}
