import { GENERATION_MAX_PAGES } from "@quizio/core/quiz/domain/generation";
import { Button } from "@quizio/ui/components/button";
import { Checkbox } from "@quizio/ui/components/checkbox";
import { Switch } from "@quizio/ui/components/switch";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@quizio/ui/components/tooltip";
import { cn } from "@quizio/ui/lib/utils";
import { InfoIcon, SparklesIcon } from "lucide-react";
import { useEffect, useId, useRef } from "react";

import { PAGE_LIMIT_LABEL } from "@/lib/assistant-labels";
import type { PdfDocumentHandle } from "@/lib/pdf-document";

import { ActionButton } from "../question-actions";

const THUMBNAIL_WIDTH = 180;
const NO_PAGE_REASON = "Escolha ao menos uma página.";

export interface PdfPagesStepProps {
	document: PdfDocumentHandle;
	pages: readonly number[];
	extract: boolean;
	createDisabledReason: string | null;
	onTogglePage: (page: number) => void;
	onSelectAll: () => void;
	onExtractChange: (extract: boolean) => void;
	onCreate: () => void;
}

/**
 * "Selecione páginas do seu arquivo" (spec 027, RN-14, RN-15): the pages as
 * thumbnails, up to the limit, and the "Extrair perguntas" switch.
 */
export function PdfPagesStep({
	document,
	pages,
	extract,
	createDisabledReason,
	onTogglePage,
	onSelectAll,
	onExtractChange,
	onCreate,
}: PdfPagesStepProps) {
	const switchLabelId = useId();
	const full = pages.length >= GENERATION_MAX_PAGES;
	const numbers = Array.from(
		{ length: document.pageCount },
		(_, index) => index + 1,
	);

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="flex items-center justify-between gap-3 border-border border-b px-4 py-3">
				<p className="text-muted-foreground text-sm">{PAGE_LIMIT_LABEL}</p>
				<Button variant="ghost" onClick={onSelectAll}>
					Selecionar tudo
				</Button>
			</div>
			<ul
				aria-label="Páginas do arquivo"
				className="grid min-h-0 flex-1 auto-rows-max grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-4 overflow-y-auto bg-muted p-4"
			>
				{numbers.map((page) => {
					const checked = pages.includes(page);
					return (
						<li
							key={page}
							className={cn(
								"relative flex flex-col items-center gap-2 rounded-md border-2 bg-card p-2 shadow-sm",
								checked ? "border-primary" : "border-transparent",
							)}
						>
							<Checkbox
								aria-label={`Página ${page}`}
								checked={checked}
								disabled={!checked && full}
								onCheckedChange={() => onTogglePage(page)}
								className="absolute top-3 left-3 size-6 bg-card [&_[data-slot=checkbox-indicator]>svg]:size-4"
							/>
							<PageThumbnail document={document} page={page} />
							<span className="rounded-sm bg-muted-foreground px-2 font-bold text-card text-sm">
								{page}
							</span>
						</li>
					);
				})}
			</ul>
			<div className="flex items-center justify-end gap-3 border-border border-t p-3">
				<div className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
					<SparklesIcon aria-hidden="true" className="size-4 text-brand" />
					<span id={switchLabelId} className="font-bold text-sm">
						Extrair perguntas
					</span>
					<Tooltip>
						<TooltipTrigger
							render={
								<button
									type="button"
									aria-label="O que é extrair perguntas"
									className="text-muted-foreground"
								/>
							}
						>
							<InfoIcon aria-hidden="true" className="size-4" />
						</TooltipTrigger>
						<TooltipContent>Extrair perguntas do seu PDF?</TooltipContent>
					</Tooltip>
					<Switch
						aria-labelledby={switchLabelId}
						checked={extract}
						onCheckedChange={(next) => onExtractChange(next)}
					/>
				</div>
				<ActionButton
					variant="brand"
					className="h-11"
					unavailableReason={
						pages.length === 0 ? NO_PAGE_REASON : createDisabledReason
					}
					onClick={onCreate}
				>
					Crie
				</ActionButton>
			</div>
		</div>
	);
}

/** Drawn by pdf.js when it scrolls into view. */
function PageThumbnail({
	document,
	page,
}: {
	document: PdfDocumentHandle;
	page: number;
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) {
			return;
		}
		let drawn = false;
		const draw = () => {
			if (!drawn) {
				drawn = true;
				void document.renderPage(page, canvas, THUMBNAIL_WIDTH).catch(() => {});
			}
		};
		if (typeof IntersectionObserver === "undefined") {
			draw();
			return;
		}
		const observer = new IntersectionObserver((entries) => {
			if (entries.some((entry) => entry.isIntersecting)) {
				draw();
				observer.disconnect();
			}
		});
		observer.observe(canvas);
		return () => observer.disconnect();
	}, [document, page]);

	return (
		// The page is only a picture of the checkbox's "Página N".
		<span aria-hidden="true" className="block w-full">
			<canvas
				ref={canvasRef}
				className="aspect-[3/4] w-full rounded-sm bg-muted object-contain"
			/>
		</span>
	);
}
