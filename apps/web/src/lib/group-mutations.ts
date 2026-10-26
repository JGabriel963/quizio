import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useTRPC } from "@/utils/trpc";

import { groupErrorMessage } from "./group-error-messages";

const showError = (error: unknown) => {
	toast.error(groupErrorMessage(error));
};

/**
 * What changes a group (spec 034). Each one refreshes every group query: the
 * lists, the recent groups, the open group and its members. Where to go
 * afterwards is the screen's call.
 */
export function useGroupMutations() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const invalidate = () =>
		queryClient.invalidateQueries({ queryKey: trpc.group.pathKey() });

	return {
		create: useMutation(
			trpc.group.create.mutationOptions({
				// The dialog tells the failure beside the field.
				meta: { suppressErrorToast: true },
				onSuccess: invalidate,
			}),
		),
		visit: useMutation(
			trpc.group.visit.mutationOptions({
				// Only feeds "Grupos recentes": a failure is not worth a toast.
				meta: { suppressErrorToast: true },
				onSuccess: () =>
					queryClient.invalidateQueries({
						queryKey: trpc.group.recent.queryKey(),
					}),
			}),
		),
		dismissSetup: useMutation(
			trpc.group.dismissSetup.mutationOptions({
				onSuccess: invalidate,
				onError: showError,
			}),
		),
		resetInvite: useMutation(
			trpc.group.invite.reset.mutationOptions({
				onSuccess: (data, variables) => {
					queryClient.setQueryData(
						trpc.group.invite.get.queryKey(variables),
						data,
					);
				},
				onError: showError,
			}),
		),
		acceptInvite: useMutation(
			trpc.group.invite.accept.mutationOptions({
				// The invite screen shows a refused link as its own state.
				meta: { suppressErrorToast: true },
				onSuccess: invalidate,
			}),
		),
		removeMember: useMutation(
			trpc.group.removeMember.mutationOptions({
				onSuccess: () => {
					toast.success("Membro removido do grupo.");
					return invalidate();
				},
				onError: showError,
			}),
		),
		leave: useMutation(
			trpc.group.leave.mutationOptions({
				onSuccess: () => {
					toast.success("Você saiu do grupo.");
					return invalidate();
				},
				onError: showError,
			}),
		),
		updateDetails: useMutation(
			trpc.group.settings.updateDetails.mutationOptions({
				// The dialog tells the failure beside the field (spec 035).
				meta: { suppressErrorToast: true },
				onSuccess: invalidate,
			}),
		),
		setPermission: useMutation(
			trpc.group.settings.setPermission.mutationOptions({
				// The switch goes back and the panel tells it (spec 035, RN-09).
				meta: { suppressErrorToast: true },
				onSuccess: invalidate,
			}),
		),
		// An assignment is also a report (spec 029): its list changes too.
		assign: useMutation(
			trpc.group.assign.mutationOptions({
				onSuccess: () => {
					toast.success("Atividade atribuída ao grupo.");
					return Promise.all([
						invalidate(),
						queryClient.invalidateQueries({ queryKey: trpc.report.pathKey() }),
					]);
				},
				onError: showError,
			}),
		),
		assignToGroups: useMutation(
			trpc.group.assignToGroups.mutationOptions({
				onSuccess: (data) => {
					toast.success(
						`Atividade atribuída a ${data.assigned} ${data.assigned === 1 ? "grupo" : "grupos"}.`,
					);
					return invalidate();
				},
				onError: showError,
			}),
		),
		setLike: useMutation(
			trpc.group.posts.setLike.mutationOptions({
				// The button goes back by itself (RN-17).
				meta: { suppressErrorToast: true },
				onError: showError,
			}),
		),
		deletePost: useMutation(
			trpc.group.posts.delete.mutationOptions({
				onSuccess: () => {
					toast.success("Publicação excluída.");
					return invalidate();
				},
				onError: showError,
			}),
		),
		remove: useMutation(
			trpc.group.delete.mutationOptions({
				onSuccess: () => {
					toast.success("Grupo excluído.");
					return invalidate();
				},
				onError: showError,
			}),
		),
	};
}
