import { Badge } from "@quizio/ui/components/badge";
import { Button } from "@quizio/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@quizio/ui/components/dropdown-menu";
import { Link } from "@tanstack/react-router";
import {
	EllipsisVerticalIcon,
	InfoIcon,
	UserIcon,
	UserXIcon,
} from "lucide-react";
import { UserAvatar } from "@/components/account/user-avatar";
import type { GroupMemberData } from "@/lib/api-types";

/** Every member is active: there are no pending invites yet (spec 034, RN-32). */
export const MEMBER_STATUS_LABEL = "Ativo";

/**
 * "Membros do grupo": Nome and Status, the admin first, with ⓘ and ⋮ on each
 * row (spec 034, RN-32, RN-33). Remover is the admin's, never on their own row.
 */
export function MembersTable({
	members,
	viewerId,
	isAdmin,
	onInfo,
	onRemove,
}: {
	members: readonly GroupMemberData[];
	viewerId: string;
	isAdmin: boolean;
	onInfo: (member: GroupMemberData) => void;
	onRemove: (member: GroupMemberData) => void;
}) {
	return (
		<div className="overflow-hidden rounded-lg bg-card shadow-sm">
			<table aria-label="Membros do grupo" className="w-full text-sm">
				<thead className="bg-muted text-left">
					<tr>
						<th scope="col" className="px-4 py-3 font-bold">
							Nome
						</th>
						<th
							scope="col"
							className="hidden px-4 py-3 font-bold sm:table-cell"
						>
							Status
						</th>
						<th scope="col" className="w-24 px-4 py-3">
							<span className="sr-only">Ações</span>
						</th>
					</tr>
				</thead>
				<tbody>
					{members.map((member) => (
						<tr key={member.userId} className="border-border border-t">
							<td className="px-4 py-2">
								<div className="flex items-center gap-3">
									<UserAvatar
										userId={member.userId}
										photoUrl={member.photoUrl}
									/>
									<div className="flex min-w-0 flex-col gap-0.5">
										<span className="flex flex-wrap items-center gap-2">
											<span className="truncate">{member.name}</span>
											{member.role === "admin" && (
												<Badge variant="role">Administrador</Badge>
											)}
										</span>
										<span className="text-muted-foreground text-xs sm:hidden">
											{MEMBER_STATUS_LABEL}
										</span>
									</div>
								</div>
							</td>
							<td className="hidden px-4 py-2 sm:table-cell">
								{MEMBER_STATUS_LABEL}
							</td>
							<td className="px-2 py-2">
								<div className="flex items-center justify-end">
									<Button
										variant="ghost"
										size="icon"
										aria-label={`Informações de ${member.name}`}
										onClick={() => onInfo(member)}
									>
										<InfoIcon />
									</Button>
									<DropdownMenu>
										<DropdownMenuTrigger
											render={
												<Button
													variant="ghost"
													size="icon"
													aria-label={`Ações para ${member.name}`}
												/>
											}
										>
											<EllipsisVerticalIcon />
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuItem onClick={() => onInfo(member)}>
												<InfoIcon />
												Informações do membro
											</DropdownMenuItem>
											<DropdownMenuItem
												render={
													<Link
														to="/profile/$userId"
														params={{ userId: member.userId }}
													/>
												}
											>
												<UserIcon />
												Ver perfil
											</DropdownMenuItem>
											{isAdmin && member.userId !== viewerId && (
												<DropdownMenuItem
													variant="destructive"
													onClick={() => onRemove(member)}
												>
													<UserXIcon />
													Remover
												</DropdownMenuItem>
											)}
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
