import { Button } from "@quizio/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@quizio/ui/components/dropdown-menu";
import { Skeleton } from "@quizio/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { BotIcon, LogOutIcon, SettingsIcon } from "lucide-react";

import { UserAvatar } from "@/components/account/user-avatar";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/utils/trpc";

interface MenuAccount {
	userId: string;
	name: string;
	email: string;
	photoUrl: string | null;
}

/**
 * The account menu, opened by the photo in the top bar (spec 039, RN-01,
 * RN-02): the photo, the name, the email and Ver perfil, then Agentes de IA
 * (spec 044), Configurações and Encerrar sessão. Nothing about plans.
 */
export function AccountMenuView({
	account,
	onSignOut,
}: {
	account: MenuAccount;
	onSignOut: () => void;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						aria-label={account.name}
						className="shrink-0 rounded-full"
					/>
				}
			>
				<UserAvatar userId={account.userId} photoUrl={account.photoUrl} />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-72 bg-card p-0">
				<div className="flex flex-col items-center gap-1 bg-muted px-4 pt-5 pb-4 text-center">
					<UserAvatar
						userId={account.userId}
						photoUrl={account.photoUrl}
						size="xl"
					/>
					<p className="mt-2 max-w-full truncate font-bold text-base">
						{account.name}
					</p>
					<p className="max-w-full truncate text-muted-foreground text-sm">
						{account.email}
					</p>
					<DropdownMenuItem
						className="mt-3 w-full justify-center border border-border bg-card font-semibold"
						render={
							<Link to="/profile/$userId" params={{ userId: account.userId }} />
						}
					>
						Ver perfil
					</DropdownMenuItem>
				</div>
				<DropdownMenuGroup className="p-1">
					<DropdownMenuItem
						render={<Link to="/settings" search={{ section: "agents" }} />}
					>
						<BotIcon />
						Agentes de IA
					</DropdownMenuItem>
					<DropdownMenuItem
						render={<Link to="/settings" search={{ section: "profile" }} />}
					>
						<SettingsIcon />
						Configurações
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem variant="destructive" onClick={onSignOut}>
						<LogOutIcon />
						Encerrar sessão
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

/** The top bar's account: the session's account, or Entrar without one. */
export default function AccountMenu() {
	const { data: session, isPending } = authClient.useSession();

	if (isPending) {
		return <Skeleton className="size-9 rounded-full" />;
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

	return <SessionAccountMenu />;
}

/** With a session, the account comes from the API, with the photo (RN-05). */
function SessionAccountMenu() {
	const trpc = useTRPC();
	const navigate = useNavigate();
	const router = useRouter();
	const account = useQuery(trpc.account.get.queryOptions());

	if (!account.data) {
		return <Skeleton className="size-9 rounded-full" />;
	}

	return (
		<>
			<AccountMenuView
				account={account.data}
				onSignOut={() => {
					authClient.signOut({
						fetchOptions: {
							onSuccess: async () => {
								await router.invalidate();
								await navigate({ to: "/" });
							},
						},
					});
				}}
			/>
			{/* Right of the photo (spec 040, RN-09). */}
			<NotificationBell />
		</>
	);
}
