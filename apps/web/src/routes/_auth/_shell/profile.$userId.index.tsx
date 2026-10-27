import { Button } from "@quizio/ui/components/button";
import { Skeleton } from "@quizio/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { CreatorProfile } from "@/components/profile/creator-profile";
import { isProfileNotFound } from "@/lib/profile-errors";
import { useTRPC } from "@/utils/trpc";

/** A creator's profile, seen by anybody with an account (spec 039, RN-27). */
export const Route = createFileRoute("/_auth/_shell/profile/$userId/")({
	component: ProfilePage,
});

function ProfilePage() {
	const { userId } = Route.useParams();
	const trpc = useTRPC();
	const profile = useQuery({
		...trpc.account.profile.queryOptions({ userId }),
		retry: (failureCount, error) =>
			!isProfileNotFound(error) && failureCount < 2,
		meta: { suppressErrorToast: true },
	});

	if (profile.isPending) {
		return (
			<div className="flex flex-col gap-6" aria-busy="true">
				<Skeleton className="h-16 w-72" />
				<Skeleton className="h-48 w-full" />
			</div>
		);
	}
	if (profile.isError) {
		return (
			<div className="flex flex-col items-center gap-4 py-16 text-center">
				<p className="font-semibold">
					{isProfileNotFound(profile.error)
						? "Este perfil não existe."
						: "Não foi possível carregar o perfil."}
				</p>
				{isProfileNotFound(profile.error) ? (
					<Button
						variant="outline"
						nativeButton={false}
						render={<Link to="/" />}
					>
						Ir para o início
					</Button>
				) : (
					<Button variant="outline" onClick={() => profile.refetch()}>
						Tentar novamente
					</Button>
				)}
			</div>
		);
	}

	return (
		<div className="mx-auto w-full max-w-6xl">
			<CreatorProfile
				profile={profile.data}
				onCopyLink={async () => {
					try {
						await navigator.clipboard.writeText(window.location.href);
						toast.success("Link copiado");
					} catch {
						toast.error("Não foi possível copiar o link.");
					}
				}}
			/>
		</div>
	);
}
