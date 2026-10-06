import { Button } from "@quizio/ui/components/button";
import { Link } from "@tanstack/react-router";
import {
	ChartColumnIcon,
	type LucideIcon,
	SearchXIcon,
	Trash2Icon,
} from "lucide-react";

type ReportEmptyStateProps =
	| { kind: "reports" }
	| { kind: "trash" }
	| { kind: "search"; search: string };

function contentFor(props: ReportEmptyStateProps): {
	icon: LucideIcon;
	message: string;
	detail?: string;
} {
	switch (props.kind) {
		case "reports":
			return {
				icon: ChartColumnIcon,
				message: "Você ainda não tem relatórios.",
				detail:
					"Eles aparecem aqui depois de cada partida ao vivo que você organizar.",
			};
		case "trash":
			return { icon: Trash2Icon, message: "A lixeira está vazia." };
		case "search":
			return {
				icon: SearchXIcon,
				message: `Nada encontrado para “${props.search}”.`,
			};
	}
}

/** What the reports' list shows when it has nothing to list (spec 015, RN-30). */
export function ReportEmptyState(props: ReportEmptyStateProps) {
	const { icon: Icon, message, detail } = contentFor(props);

	return (
		<div className="flex flex-col items-center gap-4 rounded-lg border-2 border-border border-dashed bg-card px-6 py-12 text-center">
			<Icon aria-hidden="true" className="size-10 text-muted-foreground" />
			<div className="flex flex-col gap-1">
				<p className="font-semibold">{message}</p>
				{detail && <p className="text-muted-foreground text-sm">{detail}</p>}
			</div>
			{props.kind === "reports" && (
				<Button
					nativeButton={false}
					render={<Link to="/library" search={{ section: "recent" }} />}
				>
					Ir para a biblioteca
				</Button>
			)}
		</div>
	);
}
