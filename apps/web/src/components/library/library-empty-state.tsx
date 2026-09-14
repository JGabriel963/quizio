import { Button } from "@quizio/ui/components/button";
import {
	FolderOpenIcon,
	type LucideIcon,
	PlusIcon,
	SearchXIcon,
	Trash2Icon,
} from "lucide-react";

type LibraryEmptyStateProps =
	| { kind: "library"; onCreate?: () => void }
	| { kind: "trash" }
	| { kind: "search"; search: string };

function contentFor(props: LibraryEmptyStateProps): {
	icon: LucideIcon;
	message: string;
} {
	switch (props.kind) {
		case "library":
			return { icon: FolderOpenIcon, message: "Você ainda não tem quizzes." };
		case "trash":
			return { icon: Trash2Icon, message: "A lixeira está vazia." };
		case "search":
			return {
				icon: SearchXIcon,
				message: `Nenhum quiz encontrado para “${props.search}”.`,
			};
	}
}

export function LibraryEmptyState(props: LibraryEmptyStateProps) {
	const { icon: Icon, message } = contentFor(props);

	return (
		<div className="flex flex-col items-center gap-4 rounded-lg border-2 border-border border-dashed bg-card px-6 py-12 text-center">
			<Icon aria-hidden="true" className="size-10 text-muted-foreground" />
			<p className="font-semibold">{message}</p>
			{props.kind === "library" && props.onCreate && (
				<Button onClick={props.onCreate}>
					<PlusIcon data-icon="inline-start" />
					Criar quiz
				</Button>
			)}
		</div>
	);
}
