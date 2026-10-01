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
 * What Kahoot offers once a kahoot is saved. None exists in Quizio yet: each
 * one starts working with its feature (spec 006, RN-15a).
 */
const COMING_SOON: readonly {
	icon: LucideIcon;
	name: string;
	description: string;
}[] = [
	{
		icon: PlayIcon,
		name: "Iniciar demonstração",
		description: "Execute uma sessão de teste antes de apresentar ao vivo",
	},
	{
		icon: MonitorPlayIcon,
		name: "Organizar ao vivo",
		description: "Apresente em uma tela grande",
	},
	{
		icon: PresentationIcon,
		name: "Palestra",
		description: "Apresentação de slides interativa",
	},
	{
		icon: ShareIcon,
		name: "Compartilhar",
		description: "Permita que outros organizadores usem este quiz",
	},
];

/** Shown after Salvar froze the playable version (spec 006, RN-15). */
export function QuizReadyDialog({
	open,
	onBack,
	onDone,
}: {
	open: boolean;
	/** "Voltar para edição": stays in the editor, with the quiz published. */
	onBack: () => void;
	/** "Pronto": leaves to the library. */
	onDone: () => void;
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
					{COMING_SOON.map(({ icon: Icon, name, description }) => (
						<li
							key={name}
							className="flex items-center gap-3 rounded-md bg-muted px-3 py-2.5"
						>
							<Icon
								aria-hidden="true"
								className="size-5 shrink-0 text-muted-foreground"
							/>
							<span className="flex min-w-0 flex-1 flex-col text-muted-foreground">
								<span className="font-bold text-base">{name}</span>
								<span className="text-xs">{description}</span>
							</span>
							<Badge variant="soon">Em breve</Badge>
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
