import { Badge } from "@quizio/ui/components/badge";
import { Button } from "@quizio/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@quizio/ui/components/dialog";
import {
	type LucideIcon,
	MonitorPlayIcon,
	PlayIcon,
	PresentationIcon,
	ShareIcon,
} from "lucide-react";

/**
 * What Kahoot offers once a kahoot is saved. Each one starts working with its
 * feature (spec 006, RN-15a): "Organizar ao vivo" came with the live game
 * (spec 008, RN-03).
 */
const NEXT_STEPS: readonly {
	icon: LucideIcon;
	name: string;
	description: string;
	available: boolean;
}[] = [
	{
		icon: PlayIcon,
		name: "Iniciar demonstração",
		description: "Execute uma sessão de teste antes de apresentar ao vivo",
		available: false,
	},
	{
		icon: MonitorPlayIcon,
		name: "Organizar ao vivo",
		description: "Apresente em uma tela grande",
		available: true,
	},
	{
		icon: PresentationIcon,
		name: "Palestra",
		description: "Apresentação de slides interativa",
		available: false,
	},
	{
		icon: ShareIcon,
		name: "Compartilhar",
		description: "Permita que outros organizadores usem este quiz",
		available: false,
	},
];

/** Shown after Salvar froze the playable version (spec 006, RN-15). */
export function QuizReadyDialog({
	open,
	onBack,
	onDone,
	onHostLive,
}: {
	open: boolean;
	/** "Voltar para edição": stays in the editor, with the quiz published. */
	onBack: () => void;
	/** "Pronto": leaves to the library. */
	onDone: () => void;
	/** "Organizar ao vivo": opens a live game of the quiz. */
	onHostLive: () => void;
}) {
	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) {
					onBack();
				}
			}}
		>
			<DialogContent showCloseButton={false}>
				<DialogHeader className="pr-0">
					<DialogTitle className="text-2xl">O quiz está pronto</DialogTitle>
				</DialogHeader>

				<ul aria-label="Próximos passos" className="flex flex-col gap-2">
					{NEXT_STEPS.map(({ icon: Icon, name, description, available }) => (
						<li key={name}>
							{available ? (
								<button
									type="button"
									onClick={onHostLive}
									className="flex w-full items-center gap-3 rounded-md bg-muted px-3 py-2.5 text-left outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
								>
									<Icon aria-hidden="true" className="size-5 shrink-0" />
									<span className="flex min-w-0 flex-1 flex-col">
										<span className="font-bold text-base">{name}</span>
										<span className="text-muted-foreground text-xs">
											{description}
										</span>
									</span>
								</button>
							) : (
								<div className="flex items-center gap-3 rounded-md bg-muted px-3 py-2.5">
									<Icon
										aria-hidden="true"
										className="size-5 shrink-0 text-muted-foreground"
									/>
									<span className="flex min-w-0 flex-1 flex-col text-muted-foreground">
										<span className="font-bold text-base">{name}</span>
										<span className="text-xs">{description}</span>
									</span>
									<Badge variant="soon">Em breve</Badge>
								</div>
							)}
						</li>
					))}
				</ul>

				<DialogFooter className="sm:justify-center">
					<Button variant="secondary" onClick={onBack}>
						Voltar para edição
					</Button>
					<Button onClick={onDone}>Pronto</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
