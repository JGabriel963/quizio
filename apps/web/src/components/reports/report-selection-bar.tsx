import type { ReportSection } from "@quizio/core/reports/domain/report";
import { Button } from "@quizio/ui/components/button";

/** What can be done with the selected reports at once (spec 015, RN-29). */
export function ReportSelectionBar({
	count,
	section,
	onMoveToTrash,
	onRestore,
	onDeletePermanently,
	onClear,
}: {
	count: number;
	section: ReportSection;
	onMoveToTrash: () => void;
	onRestore: () => void;
	onDeletePermanently: () => void;
	onClear: () => void;
}) {
	if (count === 0) {
		return null;
	}

	return (
		<section
			aria-label="Relatórios selecionados"
			className="flex flex-wrap items-center gap-2 rounded-lg bg-accent px-3 py-2 text-accent-foreground"
		>
			<span className="mr-auto font-semibold text-sm">
				{count} {count === 1 ? "selecionado" : "selecionados"}
			</span>
			{section === "trash" ? (
				<>
					<Button variant="outline" size="sm" onClick={onRestore}>
						Restaurar
					</Button>
					<Button variant="destructive" size="sm" onClick={onDeletePermanently}>
						Excluir definitivamente
					</Button>
				</>
			) : (
				<Button variant="destructive" size="sm" onClick={onMoveToTrash}>
					Mover para a lixeira
				</Button>
			)}
			<Button variant="ghost" size="sm" onClick={onClear}>
				Limpar seleção
			</Button>
		</section>
	);
}
