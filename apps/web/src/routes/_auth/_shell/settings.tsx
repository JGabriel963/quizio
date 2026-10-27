import { Skeleton } from "@quizio/ui/components/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createFileRoute,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AiAccessSection } from "@/components/account/ai-access-section";
import { DeleteAccountSection } from "@/components/account/delete-account-section";
import { PasswordSection } from "@/components/account/password-section";
import {
	ProfilePhotoDialog,
	type UploadProfilePhoto,
} from "@/components/account/profile-photo-dialog";
import { ProfileSection } from "@/components/account/profile-section";
import { SettingsLayout } from "@/components/account/settings-layout";
import { type AccountSection, accountSectionOf } from "@/lib/account-sections";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-error-messages";
import { cropToSquare } from "@/lib/crop-to-square";
import { uploadFile } from "@/lib/upload-file";
import { useTRPC } from "@/utils/trpc";

/** Configurações (spec 039, RN-03): the open section is in the address. */
export const Route = createFileRoute("/_auth/_shell/settings")({
	validateSearch: (search): { section: AccountSection } => ({
		section: accountSectionOf(search.section),
	}),
	component: SettingsPage,
});

function SettingsPage() {
	const { section } = Route.useSearch();
	const trpc = useTRPC();
	const account = useQuery(trpc.account.get.queryOptions());

	return (
		<SettingsLayout section={section}>
			{account.data ? (
				<SettingsSection section={section} account={account.data} />
			) : (
				<Skeleton className="h-64 w-full" />
			)}
		</SettingsLayout>
	);
}

interface Account {
	userId: string;
	name: string;
	email: string;
	photoUrl: string | null;
	hasPassword: boolean;
}

function SettingsSection({
	section,
	account,
}: {
	section: AccountSection;
	account: Account;
}) {
	switch (section) {
		case "profile":
			return <ProfileSettings account={account} />;
		case "ai":
			return <AiAccessSettings />;
		case "password":
			return (
				<PasswordSection
					account={account}
					onChange={({ currentPassword, newPassword }) =>
						authClient.changePassword({
							currentPassword,
							newPassword,
							revokeOtherSessions: true,
						})
					}
				/>
			);
		case "delete":
			return <DeleteAccountSettings account={account} />;
	}
}

function ProfileSettings({ account }: { account: Account }) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [photoOpen, setPhotoOpen] = useState(false);
	const refreshAccount = () =>
		queryClient.invalidateQueries({ queryKey: trpc.account.pathKey() });
	const requestUpload = useMutation(
		trpc.account.requestPhotoUpload.mutationOptions(),
	);
	const setPhoto = useMutation(trpc.account.setPhoto.mutationOptions());
	const removePhoto = useMutation(trpc.account.removePhoto.mutationOptions());

	// Crop in the browser, upload the square straight to storage, then keep it
	// (RN-09, RN-10; ADR 0019).
	const upload: UploadProfilePhoto = async (file, crop, options) => {
		const photo = await cropToSquare(file, crop);
		const target = await requestUpload.mutateAsync({
			contentType: photo.type,
			sizeBytes: photo.size,
		});
		await uploadFile({
			file: photo,
			upload: target,
			signal: options.signal,
			onProgress: options.onProgress,
		});
		await setPhoto.mutateAsync({ key: target.key });
		await refreshAccount();
	};

	return (
		<>
			<ProfileSection
				account={account}
				onOpenPhoto={() => setPhotoOpen(true)}
				onRename={async (name) => {
					const { error } = await authClient.updateUser({ name });
					if (error) {
						toast.error(authErrorMessage(error));
						return;
					}
					await refreshAccount();
					toast.success("Nome alterado");
				}}
			/>
			<ProfilePhotoDialog
				open={photoOpen}
				hasPhoto={account.photoUrl !== null}
				onClose={() => setPhotoOpen(false)}
				upload={upload}
				onRemove={async () => {
					await removePhoto.mutateAsync();
					await refreshAccount();
				}}
			/>
		</>
	);
}

function AiAccessSettings() {
	const trpc = useTRPC();
	const status = useQuery(trpc.quiz.assistant.status.queryOptions());
	return status.data ? (
		<AiAccessSection status={status.data} />
	) : (
		<Skeleton className="h-32 w-full" />
	);
}

function DeleteAccountSettings({ account }: { account: Account }) {
	const trpc = useTRPC();
	const router = useRouter();
	const navigate = useNavigate();
	const deleteAccount = useMutation(trpc.account.delete.mutationOptions());

	return (
		<DeleteAccountSection
			account={account}
			onDelete={async (request) => {
				await deleteAccount.mutateAsync(request);
				// The server already ended the session with the account; this only
				// clears what the browser kept of it (RN-42).
				await authClient.signOut().catch(() => {});
				await router.invalidate();
				await navigate({ to: "/" });
				toast.success("Sua conta foi excluída.");
			}}
		/>
	);
}
