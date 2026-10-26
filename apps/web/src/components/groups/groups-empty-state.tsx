import { Button } from "@quizio/ui/components/button";
import {
	type LucideIcon,
	SearchXIcon,
	SquareCheckBigIcon,
	TrophyIcon,
	UsersIcon,
} from "lucide-react";

const PILLARS: readonly { label: string; icon: LucideIcon }[] = [
	{ label: "Colaborar", icon: UsersIcon },
	{ label: "Atribuir", icon: SquareCheckBigIcon },
	{ label: "Competir", icon: TrophyIcon },
];

const panel =
	"flex flex-col items-center gap-6 rounded-lg border-2 border-border border-dashed px-6 py-16 text-center";

/** What the groups' list shows with nothing to list (spec 034, RN-09). */
export function GroupsEmptyState({
	kind,
	onCreate,
}: {
	kind: "managed" | "joined" | "search";
	onCreate: () => void;
}) {
	if (kind === "search") {
		return (
			<div className={panel}>
				<SearchXIcon
					aria-hidden="true"
					className="size-10 text-muted-foreground"
				/>
				<p className="font-semibold">Nenhum grupo encontrado.</p>
			</div>
		);
	}
	if (kind === "joined") {
		return (
			<div className={panel}>
				<UsersIcon
					aria-hidden="true"
					className="size-10 text-muted-foreground"
				/>
				<p className="max-w-md text-sm">
					Você ainda não participa de nenhum grupo. Peça o link de convite a
					quem administra o grupo.
				</p>
			</div>
		);
	}
	return (
		<div className={panel}>
			<ul className="flex flex-wrap justify-center gap-10">
				{PILLARS.map(({ label, icon: Icon }) => (
					<li key={label} className="flex flex-col items-center gap-3">
						<span className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
							<Icon aria-hidden="true" className="size-8" />
						</span>
						<span className="font-bold text-sm">{label}</span>
					</li>
				))}
			</ul>
			<p className="max-w-md text-sm">
				Os grupos são o ponto de encontro e comunicação da sua equipe para
				compartilhar conteúdos, aprender e se divertir juntos. Crie seu primeiro
				grupo agora mesmo!
			</p>
			<Button onClick={onCreate}>Criar grupo</Button>
		</div>
	);
}
