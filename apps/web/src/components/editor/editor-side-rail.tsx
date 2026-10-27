import { cn } from "@quizio/ui/lib/utils";
import { PaletteIcon, SlidersVerticalIcon } from "lucide-react";
import type { ReactNode } from "react";

export type EditorPanel = "themes" | "properties";

/**
 * The editor's right edge (spec 042, RN-22, RN-23): "Temas" and
 * "Propriedades", the open one pressed. Pressing it again closes the panel.
 */
export function EditorSideRail({
	open,
	onOpen,
	className,
}: {
	open: EditorPanel | null;
	onOpen: (panel: EditorPanel | null) => void;
	className?: string;
}) {
	const button = (panel: EditorPanel, label: string, icon: ReactNode) => (
		<button
			type="button"
			aria-pressed={open === panel}
			title={label}
			onClick={() => onOpen(open === panel ? null : panel)}
			className={cn(
				"flex w-full flex-col items-center gap-1 rounded-md border-2 border-transparent px-0.5 py-2 font-semibold text-xs outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
				open === panel && "border-primary bg-primary/10",
			)}
		>
			{icon}
			{/* Cut with "…" only when the rail is too narrow, as in Kahoot. */}
			<span className="w-full truncate text-center">{label}</span>
		</button>
	);

	return (
		<div
			role="toolbar"
			aria-label="Painéis do editor"
			aria-orientation="vertical"
			className={cn("flex w-26 shrink-0 flex-col gap-2 p-1", className)}
		>
			{button(
				"themes",
				"Temas",
				<PaletteIcon aria-hidden="true" className="size-5" />,
			)}
			{button(
				"properties",
				"Propriedades",
				<SlidersVerticalIcon aria-hidden="true" className="size-5" />,
			)}
		</div>
	);
}
