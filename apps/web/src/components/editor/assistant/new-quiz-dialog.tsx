import { Button } from "@quizio/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogTitle,
} from "@quizio/ui/components/dialog";
import { cn } from "@quizio/ui/lib/utils";
import { FileTextIcon, PencilLineIcon, PlusIcon } from "lucide-react";
import type { ReactNode } from "react";

import type { AssistantSource } from "@/lib/assistant-state";

import { AiBadge } from "./ai-badge";

/**
 * "Criar um novo quiz", over the editor right after Criar (spec 027, RN-03):
 * start from a topic or a PDF with the assistant, or from the blank question.
 */
export function NewQuizDialog({
	open,
	onChoose,
	onClose,
}: {
	open: boolean;
	onChoose: (source: AssistantSource) => void;
	onClose: () => void;
}) {
	return (
		<Dialog open={open} onOpenChange={(next) => !next && onClose()}>
			<DialogContent
				showCloseButton={false}
				className="gap-0 overflow-hidden p-0 sm:max-w-3xl"
			>
				<DialogTitle className="border-border border-b px-5 py-4 text-base">
					Criar um novo quiz
				</DialogTitle>
				<div className="grid gap-4 bg-muted p-5 sm:grid-cols-3 sm:p-8">
					<ChoiceCard
						icon={<FileTextIcon />}
						iconClassName="bg-linear-to-br from-answer-blue to-brand text-white"
						title="PDF para quiz"
						description="Crie ou extraia perguntas a partir do seu PDF"
						badge={<AiBadge />}
						onClick={() => onChoose("pdf")}
					/>
					<ChoiceCard
						icon={<PencilLineIcon />}
						iconClassName="bg-linear-to-br from-answer-blue to-brand text-white"
						title="Assunto > quiz"
						description="Crie um quiz com base em um assunto"
						badge={<AiBadge />}
						onClick={() => onChoose("topic")}
					/>
					<ChoiceCard
						icon={<PlusIcon />}
						iconClassName="bg-muted text-muted-foreground shadow-press-light"
						title="Tela em branco"
						description="Começar do zero"
						onClick={onClose}
					/>
				</div>
				<DialogFooter className="justify-center! p-4">
					<Button variant="secondary" onClick={onClose}>
						Fechar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function ChoiceCard({
	icon,
	iconClassName,
	title,
	description,
	badge,
	onClick,
}: {
	icon: ReactNode;
	iconClassName: string;
	title: string;
	description: string;
	badge?: ReactNode;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex flex-col items-center gap-3 rounded-lg bg-card p-5 text-center shadow-sm outline-none transition-shadow hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 sm:min-h-56"
		>
			<span
				aria-hidden="true"
				className={cn(
					"flex size-14 items-center justify-center rounded-md [&_svg]:size-7",
					iconClassName,
				)}
			>
				{icon}
			</span>
			<span className="font-bold text-base">{title}</span>
			<span className="text-muted-foreground text-sm">{description}</span>
			{badge && <span className="mt-auto">{badge}</span>}
		</button>
	);
}
