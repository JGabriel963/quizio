import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@quizio/ui/components/alert-dialog";
import { Button } from "@quizio/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@quizio/ui/components/dropdown-menu";
import { CopyIcon, EllipsisVerticalIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

/** What the cards of a shared quiz can do, wired by the group's page. */
export interface SharedQuizActions {
	groupId: string;
	onDuplicate: (quizId: string) => Promise<unknown>;
	onUnshare: (quizId: string) => Promise<unknown>;
}

/**
 * The ⋮ of a shared quiz's card (spec 037, RN-11): Duplicar for every member,
 * and "Remover do grupo" for who shared it and the admin, which asks first
 * (RN-13).
 */
export function SharedQuizMenu({
	quiz,
	actions,
}: {
	quiz: { quizId: string; title: string; canUnshare: boolean };
	actions: SharedQuizActions;
}) {
	const [removing, setRemoving] = useState(false);

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							variant="ghost"
							size="icon"
							aria-label={`Opções de ${quiz.title}`}
						/>
					}
				>
					<EllipsisVerticalIcon />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem
						onClick={() => void actions.onDuplicate(quiz.quizId)}
					>
						<CopyIcon />
						Duplicar
					</DropdownMenuItem>
					{quiz.canUnshare && (
						<DropdownMenuItem
							variant="destructive"
							onClick={() => setRemoving(true)}
						>
							<Trash2Icon />
							Remover do grupo
						</DropdownMenuItem>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
			<AlertDialog open={removing} onOpenChange={setRemoving}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remover do grupo?</AlertDialogTitle>
						<AlertDialogDescription>
							Os membros deixam de ver e de usar {quiz.title}.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={() => {
								setRemoving(false);
								void actions.onUnshare(quiz.quizId);
							}}
						>
							Remover
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
