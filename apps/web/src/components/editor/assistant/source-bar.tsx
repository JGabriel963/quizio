import { Button } from "@quizio/ui/components/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@quizio/ui/components/select";
import { Textarea } from "@quizio/ui/components/textarea";
import { cn } from "@quizio/ui/lib/utils";
import {
	FileTextIcon,
	LayoutGridIcon,
	ListIcon,
	Rows2Icon,
	SparklesIcon,
	UploadIcon,
	XIcon,
} from "lucide-react";
import { useId } from "react";

import { PERSONAL_DATA_NOTICE } from "@/lib/assistant-labels";
import type { AssistantLayout, AssistantSource } from "@/lib/assistant-state";

import { ActionButton } from "../question-actions";

const SOURCES: { value: AssistantSource; label: string }[] = [
	{ value: "topic", label: "Assunto" },
	{ value: "pdf", label: "PDF" },
];

const LAYOUTS: {
	value: AssistantLayout;
	label: string;
	icon: typeof ListIcon;
}[] = [
	{ value: "single", label: "Uma coluna", icon: Rows2Icon },
	{ value: "grid", label: "Grade", icon: LayoutGridIcon },
	{ value: "list", label: "Lista", icon: ListIcon },
];

export const BLANK_TOPIC_REASON = "Escreva sobre o que será o quiz.";

export interface SourceBarProps {
	source: AssistantSource;
	topic: string;
	/** The file in use, or null before one is sent. */
	pdfName: string | null;
	/** Why Crie cannot run now (quota, creating...), or null. */
	createDisabledReason: string | null;
	busy: boolean;
	layout: AssistantLayout;
	onSourceChange: (source: AssistantSource) => void;
	onTopicChange: (topic: string) => void;
	onUpload: () => void;
	onRemovePdf: () => void;
	onCreate: () => void;
	onLayoutChange: (layout: AssistantLayout) => void;
}

/**
 * The top of the assistant (spec 027, RN-04 to RN-06, RN-12): the source,
 * the topic or the file, Crie (or Carregar) and the three layouts of the grid.
 */
export function SourceBar({
	source,
	topic,
	pdfName,
	createDisabledReason,
	busy,
	layout,
	onSourceChange,
	onTopicChange,
	onUpload,
	onRemovePdf,
	onCreate,
	onLayoutChange,
}: SourceBarProps) {
	const sourceLabelId = useId();
	const needsFile = source === "pdf" && pdfName === null;
	const reason =
		createDisabledReason ??
		(source === "topic" && topic.trim() === "" ? BLANK_TOPIC_REASON : null);

	return (
		<div className="flex flex-col gap-2 border-border border-b bg-card p-3 sm:p-4">
			<div className="flex flex-wrap items-start gap-2">
				<span id={sourceLabelId} className="sr-only">
					Fonte
				</span>
				<Select
					items={SOURCES}
					value={source}
					onValueChange={(next) => onSourceChange(next as AssistantSource)}
				>
					<SelectTrigger
						aria-labelledby={sourceLabelId}
						className="h-11 w-32 bg-muted"
					>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{SOURCES.map((item) => (
							<SelectItem key={item.value} value={item.value}>
								{item.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<div className="min-w-48 flex-1">
					{source === "topic" ? (
						<Textarea
							aria-label="Assunto"
							rows={1}
							placeholder="Digite um tópico, cole um texto ou adicione instruções"
							value={topic}
							onChange={(event) => onTopicChange(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === "Enter" && !event.shiftKey && !reason) {
									event.preventDefault();
									onCreate();
								}
							}}
							className="max-h-40 min-h-11 focus-visible:border-brand focus-visible:ring-brand/25"
						/>
					) : pdfName === null ? (
						<p className="flex h-11 items-center rounded-md border border-input border-dashed px-3 text-muted-foreground text-sm">
							Carregue seu arquivo ou o arraste até aqui
						</p>
					) : (
						<p className="flex h-11 items-center rounded-md border border-input border-dashed px-2">
							<span className="flex min-w-0 items-center gap-1 rounded-sm bg-primary py-1 pr-1 pl-2 font-bold text-primary-foreground text-sm">
								<FileTextIcon aria-hidden="true" className="size-4 shrink-0" />
								<span className="truncate">{pdfName}</span>
								<button
									type="button"
									aria-label={`Remover ${pdfName}`}
									onClick={onRemovePdf}
									className="rounded-sm p-0.5 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white"
								>
									<XIcon aria-hidden="true" className="size-4" />
								</button>
							</span>
						</p>
					)}
				</div>

				{needsFile ? (
					<Button className="h-11" onClick={onUpload}>
						<UploadIcon data-icon="inline-start" />
						Carregar
					</Button>
				) : (
					<ActionButton
						variant="brand"
						className="h-11 bg-linear-to-r from-brand to-[#8b2bd8]"
						unavailableReason={reason}
						onClick={onCreate}
					>
						<SparklesIcon data-icon="inline-start" />
						{busy ? "Criando…" : "Crie"}
					</ActionButton>
				)}

				<fieldset className="flex h-11 overflow-hidden rounded-md bg-muted max-sm:hidden">
					<legend className="sr-only">Disposição das perguntas</legend>
					{LAYOUTS.map(({ value, label, icon: Icon }) => (
						<button
							key={value}
							type="button"
							aria-label={label}
							aria-pressed={layout === value}
							onClick={() => onLayoutChange(value)}
							className={cn(
								"flex w-11 items-center justify-center text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
								layout === value && "bg-card text-foreground shadow-sm",
							)}
						>
							<Icon aria-hidden="true" className="size-5" />
						</button>
					))}
				</fieldset>
			</div>
			{source === "pdf" && pdfName !== null && (
				<p className="text-muted-foreground text-xs">{PERSONAL_DATA_NOTICE}</p>
			)}
		</div>
	);
}
