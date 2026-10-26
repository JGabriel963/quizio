import { Button } from "@quizio/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@quizio/ui/components/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@quizio/ui/components/tooltip";
import { Link } from "@tanstack/react-router";
import {
	EllipsisVerticalIcon,
	InfoIcon,
	LogOutIcon,
	SettingsIcon,
	Trash2Icon,
	UsersIcon,
} from "lucide-react";

import type { GroupViewData } from "@/lib/api-types";

import { UserAvatar } from "./user-avatar";

/** The group's name, its members, ⚙ and ⋮ (spec 034, RN-13, RN-18). */
export function GroupHeader({
	group,
	onInfo,
	onLeave,
	onDelete,
}: {
	group: GroupViewData;
	onInfo: () => void;
	onLeave: () => void;
	onDelete: () => void;
}) {
	const isAdmin = group.role === "admin";
	// The admin may hide the list from members (spec 035, RN-13).
	const seeMembers = group.abilities.seeMembers;
	const hidden = group.memberCount - group.memberPreview.length;

	return (
		<header className="flex flex-wrap items-center justify-between gap-3">
			<h1 className="min-w-0 break-words font-bold text-2xl uppercase">
				{group.name}
			</h1>
			<div className="flex items-center gap-2">
				{seeMembers && (
					<Link
						to="/groups/$groupId/members"
						params={{ groupId: group.id }}
						aria-label={`Ver os ${group.memberCount} membros`}
						className="flex items-center rounded-full pr-1 hover:bg-muted"
					>
						{group.memberPreview.map((member, index) => (
							<UserAvatar
								key={member.userId}
								userId={member.userId}
								className={index > 0 ? "-ml-2" : undefined}
							/>
						))}
						{hidden > 0 && (
							<span className="ml-1 font-semibold text-muted-foreground text-sm">
								+{hidden}
							</span>
						)}
					</Link>
				)}
				{isAdmin && (
					// The admin's settings (spec 035, RN-01).
					<Tooltip>
						<TooltipTrigger
							render={
								<Button
									variant="ghost"
									size="icon"
									aria-label="Configurações do grupo"
									nativeButton={false}
									render={
										<Link
											to="/groups/$groupId/settings"
											params={{ groupId: group.id }}
										/>
									}
								/>
							}
						>
							<SettingsIcon />
						</TooltipTrigger>
						<TooltipContent>Configurações do grupo</TooltipContent>
					</Tooltip>
				)}
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button
								variant="ghost"
								size="icon"
								aria-label="Opções do grupo"
							/>
						}
					>
						<EllipsisVerticalIcon />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={onInfo}>
							<InfoIcon />
							Informações do grupo
						</DropdownMenuItem>
						{seeMembers && (
							<DropdownMenuItem
								render={
									<Link
										to="/groups/$groupId/members"
										params={{ groupId: group.id }}
									/>
								}
							>
								<UsersIcon />
								Ver membros
							</DropdownMenuItem>
						)}
						{isAdmin ? (
							<DropdownMenuItem variant="destructive" onClick={onDelete}>
								<Trash2Icon />
								Excluir grupo
							</DropdownMenuItem>
						) : (
							<DropdownMenuItem onClick={onLeave}>
								<LogOutIcon />
								Sair do grupo
							</DropdownMenuItem>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</header>
	);
}
