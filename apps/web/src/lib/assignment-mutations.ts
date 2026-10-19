import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useTRPC } from "@/utils/trpc";

import { assignmentErrorMessage } from "./assignment-error-messages";

/**
 * "Alterar prazo" and "Encerrar agora" from an assignment's report (spec 029,
 * RN-36 to RN-43): each one refreshes the report, the list and the card of
 * the home page.
 */
export function useAssignmentMutations() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const invalidate = () =>
		Promise.all([
			queryClient.invalidateQueries({ queryKey: trpc.report.list.pathKey() }),
			queryClient.invalidateQueries({ queryKey: trpc.report.get.pathKey() }),
		]);

	const changeDeadline = useMutation(
		trpc.game.assignment.changeDeadline.mutationOptions({
			networkMode: "always",
			// The dialog tells why and keeps the deadline (RN-43).
			meta: { suppressErrorToast: true },
			onSuccess: invalidate,
		}),
	);
	const end = useMutation(
		trpc.game.assignment.end.mutationOptions({
			networkMode: "always",
			onSuccess: () => {
				toast.success("Atribuição encerrada.");
				return invalidate();
			},
			onError: (error) =>
				toast.error(
					assignmentErrorMessage(
						error,
						"Não foi possível encerrar a atribuição. Tente novamente.",
					),
				),
		}),
	);

	return { changeDeadline, end };
}
