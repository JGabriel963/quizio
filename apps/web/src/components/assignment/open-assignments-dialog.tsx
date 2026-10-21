import { Button } from "@quizio/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@quizio/ui/components/dialog";
import { UserRoundIcon } from "lucide-react";

import { timeUntil } from "@/lib/time-until";

import type { ShareableAssignment } from "./share-assignment-dialog";

/**
 * "Atividades em andamento" (spec 029, RN-05a): the quiz already has open
 * assignments, which can be shared again, or another can be created.
 */
export function OpenAssignmentsDialog({
	open,
	onOpenChange,
	assignments,
	onSelect,
	onCreateNew,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** The one ending first on top. */
	assignments: ShareableAssignment[];
	onSelect: (assignment: ShareableAssignment) => void;
	onCreateNew: () => void;
}) {
	const title =
		assignments.length === 1
			? "Atividade em andamento"
			: `${assignments.length} atividades em andamento`;

	return (
		<Dialog open={open} onOpenChange={(next) => onOpenChange(next)}>
			<DialogContent className="sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>
						É possível selecionar a atividade abaixo para convidar mais
						participantes ou criar uma nova atividade.
					</DialogDescription>
				</DialogHeader>
				<ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
					{assignments.map((assignment) => (
						<li key={assignment.gameId}>
							<button
								type="button"
								onClick={() => onSelect(assignment)}
								className="flex w-full items-center gap-3 rounded-md border bg-muted/40 px-4 py-3 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
							>
								<span
									aria-hidden="true"
									className="size-2.5 shrink-0 rounded-full bg-primary"
								/>
								<span className="min-w-0 flex-1">
									<span className="block truncate font-bold">
										{assignment.name}
									</span>
									<span className="block text-muted-foreground text-sm">
										Termina: {timeUntil(assignment.remainingMs)}
									</span>
								</span>
								<span className="flex items-center gap-1 text-sm">
									<UserRoundIcon aria-hidden="true" className="size-4" />
									<span className="sr-only">Participantes: </span>
									{assignment.participantCount}
								</span>
							</button>
						</li>
					))}
				</ul>
				<DialogFooter className="sm:justify-center">
					<Button variant="secondary" onClick={() => onOpenChange(false)}>
						Cancelar
					</Button>
					<Button onClick={onCreateNew}>Criar novo</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
