import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useTRPC } from "@/utils/trpc";

import { reportErrorMessage } from "./report-error-messages";

const showError = (error: unknown) => {
	toast.error(reportErrorMessage(error));
};

/**
 * What changes a report (spec 015): each one refreshes the list, the
 * dashboard's card and the report that may be open.
 */
export function useReportMutations() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const invalidate = () =>
		Promise.all([
			queryClient.invalidateQueries({ queryKey: trpc.report.list.pathKey() }),
			queryClient.invalidateQueries({ queryKey: trpc.report.get.pathKey() }),
		]);

	const rename = useMutation(
		trpc.report.rename.mutationOptions({
			// Whoever asks tells the failure beside the field (RN-47).
			meta: { suppressErrorToast: true },
			onSuccess: invalidate,
		}),
	);
	const restore = useMutation(
		trpc.report.restore.mutationOptions({
			onSuccess: invalidate,
			onError: showError,
		}),
	);
	const moveToTrash = useMutation(
		trpc.report.moveToTrash.mutationOptions({
			onSuccess: (_, variables) => {
				// Reversible, so an undo in place of a confirmation (RN-50).
				const several = variables.gameIds.length > 1;
				toast(
					several
						? `${variables.gameIds.length} relatórios movidos para a lixeira.`
						: "Relatório movido para a lixeira.",
					{
						action: {
							label: "Desfazer",
							onClick: () => restore.mutate(variables),
						},
					},
				);
				return invalidate();
			},
			onError: showError,
		}),
	);
	const deletePermanently = useMutation(
		trpc.report.deletePermanently.mutationOptions({
			onSuccess: (_, variables) => {
				toast.success(
					variables.gameIds.length > 1
						? "Relatórios excluídos definitivamente."
						: "Relatório excluído definitivamente.",
				);
				return invalidate();
			},
			onError: showError,
		}),
	);

	return { rename, moveToTrash, restore, deletePermanently };
}
