import { Button } from "@quizio/ui/components/button";
import { Checkbox } from "@quizio/ui/components/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@quizio/ui/components/dialog";
import { Skeleton } from "@quizio/ui/components/skeleton";
import { Link } from "@tanstack/react-router";
import { UsersRoundIcon } from "lucide-react";
import { useEffect, useId, useState } from "react";

import type { AssignableGroupData } from "@/lib/api-types";

/**
 * "Atribuir a grupos" (spec 038, RN-26, RN-27): the groups where the person
 * may assign, with a check each; the ones that already have the assignment
 * are checked and unavailable. The caller assigns; a refusal keeps it open.
 */
export function AssignToGroupsDialog({
	open,
	groups,
	onAssign,
	onClose,
}: {
	open: boolean;
	/** Undefined while loading. */
	groups: readonly AssignableGroupData[] | undefined;
	onAssign: (groupIds: string[]) => Promise<unknown>;
	onClose: () => void;
}) {
	const [checked, setChecked] = useState<ReadonlySet<string>>(new Set());
	const [sending, setSending] = useState(false);

	// Every opening starts with nothing new checked.
	useEffect(() => {
		if (open) {
			setChecked(new Set());
		}
	}, [open]);

	function toggle(groupId: string, on: boolean) {
		setChecked((current) => {
			const next = new Set(current);
			if (on) {
				next.add(groupId);
			} else {
				next.delete(groupId);
			}
			return next;
		});
	}

	async function assign() {
		setSending(true);
		try {
			await onAssign(
				(groups ?? [])
					.filter((group) => checked.has(group.id))
					.map((group) => group.id),
			);
			onClose();
		} catch {
			// The mutation tells the refusal; the choice stays to send again.
		} finally {
			setSending(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={(next) => !next && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Atribuir a grupos</DialogTitle>
					<DialogDescription>
						A atividade é publicada no mural e nas atribuições de cada grupo
						marcado.
					</DialogDescription>
				</DialogHeader>

				{groups === undefined ? (
					<div className="flex flex-col gap-2">
						<Skeleton className="h-10" />
						<Skeleton className="h-10" />
					</div>
				) : groups.length === 0 ? (
					<div className="flex flex-col items-center gap-3 py-4 text-center">
						<UsersRoundIcon
							aria-hidden="true"
							className="size-10 text-muted-foreground"
						/>
						<p className="text-sm">Você não tem grupos onde possa atribuir.</p>
						<Button
							nativeButton={false}
							render={<Link to="/groups" search={{ section: "managed" }} />}
						>
							Criar grupo
						</Button>
					</div>
				) : (
					<>
						<ul className="flex max-h-72 flex-col overflow-y-auto">
							{groups.map((group) => (
								<GroupCheck
									key={group.id}
									group={group}
									checked={group.alreadyAssigned || checked.has(group.id)}
									onCheck={(on) => toggle(group.id, on)}
								/>
							))}
						</ul>
						<DialogFooter>
							<Button variant="secondary" onClick={onClose}>
								Cancelar
							</Button>
							<Button
								disabled={checked.size === 0 || sending}
								onClick={() => void assign()}
							>
								Atribuir
							</Button>
						</DialogFooter>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}

function GroupCheck({
	group,
	checked,
	onCheck,
}: {
	group: AssignableGroupData;
	checked: boolean;
	onCheck: (on: boolean) => void;
}) {
	const labelId = useId();

	return (
		<li className="flex items-center gap-3 border-border border-b py-3 last:border-b-0">
			<Checkbox
				aria-labelledby={labelId}
				checked={checked}
				disabled={group.alreadyAssigned}
				onCheckedChange={(on) => onCheck(on === true)}
			/>
			<span id={labelId} className="min-w-0 flex-1 truncate font-semibold">
				{group.name}
			</span>
			{group.alreadyAssigned && (
				<span className="text-muted-foreground text-xs">Já atribuída</span>
			)}
		</li>
	);
}
