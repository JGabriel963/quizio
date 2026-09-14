import { Button } from "@quizio/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@quizio/ui/components/dropdown-menu";
import { Skeleton } from "@quizio/ui/components/skeleton";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";

export default function UserMenu() {
	const navigate = useNavigate();
	const router = useRouter();
	const { data: session, isPending } = authClient.useSession();

	if (isPending) {
		return <Skeleton className="h-10 w-24" />;
	}

	if (!session) {
		return (
			<Button
				variant="outline"
				render={<Link to="/login" />}
				nativeButton={false}
			>
				Entrar
			</Button>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger render={<Button variant="outline" />}>
				{session.user.name}
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="bg-card">
				<DropdownMenuGroup>
					<DropdownMenuLabel>Minha conta</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuItem disabled>{session.user.email}</DropdownMenuItem>
					<DropdownMenuItem
						variant="destructive"
						onClick={() => {
							authClient.signOut({
								fetchOptions: {
									onSuccess: async () => {
										await router.invalidate();
										await navigate({ to: "/" });
									},
								},
							});
						}}
					>
						Sair
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
