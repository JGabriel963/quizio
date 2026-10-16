import {
	GENERATION_COUNTS,
	GENERATION_FORMATS,
	GENERATION_LANGUAGES,
	type GenerationOptions,
	SKILL_LEVELS,
} from "@quizio/core/quiz/domain/generation";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@quizio/ui/components/select";
import { cn } from "@quizio/ui/lib/utils";
import { ChevronDownIcon } from "lucide-react";
import { useId, useState } from "react";

import {
	addLimitReason,
	countLabel,
	FORMAT_LABELS,
	LANGUAGE_LABELS,
	LEVEL_LABELS,
	remainingLabel,
} from "@/lib/assistant-labels";
import type { AssistantSource } from "@/lib/assistant-state";

import { ActionButton } from "../question-actions";

export interface OptionsPanelProps {
	source: AssistantSource;
	options: GenerationOptions;
	remaining: number;
	checkedCount: number;
	totalCount: number;
	/** The quiz's questions, not counting a lone blank one that would be replaced (RN-26). */
	questionCount: number;
	/** A creation or an addition is running. */
	busy: boolean;
	onChange: (options: Partial<GenerationOptions>) => void;
	onAdd: () => void;
	onAddAll: () => void;
}

const BUSY_REASON = "Aguarde a criação terminar.";

/**
 * The assistant's side panel (spec 027, RN-07 to RN-11, RN-25, RN-27, RN-32):
 * format, language, level and duration, the uses left and the add buttons.
 */
export function OptionsPanel({
	source,
	options,
	remaining,
	checkedCount,
	totalCount,
	questionCount,
	busy,
	onChange,
	onAdd,
	onAddAll,
}: OptionsPanelProps) {
	// On phones the options fold away, so the questions keep the screen.
	const [expanded, setExpanded] = useState(false);
	const optionsId = useId();
	const extracting = options.format === "extract";
	const formats = GENERATION_FORMATS.filter(
		(format) => source === "pdf" || format !== "extract",
	);
	const languages = extracting
		? (["auto"] as const)
		: GENERATION_LANGUAGES.filter((language) => language !== "auto");

	const addReason = busy
		? BUSY_REASON
		: checkedCount === 0
			? "Marque as perguntas que quer adicionar."
			: addLimitReason(questionCount, checkedCount);
	const addAllReason = busy
		? BUSY_REASON
		: totalCount === 0
			? "Nenhuma pergunta criada ainda."
			: addLimitReason(questionCount, totalCount);

	return (
		<div className="flex h-full flex-col">
			<button
				type="button"
				aria-expanded={expanded}
				aria-controls={optionsId}
				onClick={() => setExpanded((open) => !open)}
				className="flex items-center justify-between px-4 py-3 font-bold text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:hidden"
			>
				Opções da criação
				<ChevronDownIcon
					aria-hidden="true"
					className={cn(
						"size-4 transition-transform",
						expanded && "rotate-180",
					)}
				/>
			</button>
			<div
				id={optionsId}
				className={cn(
					"flex flex-col gap-5 overflow-y-auto p-4 max-lg:pt-0",
					!expanded && "max-lg:hidden",
				)}
			>
				<OptionSelect
					label="Formato"
					value={options.format}
					items={formats.map((format) => ({
						value: format,
						label: FORMAT_LABELS[format],
					}))}
					onChange={(format) =>
						onChange({ format: format as GenerationOptions["format"] })
					}
				/>
				<OptionSelect
					label="Idioma"
					value={extracting ? "auto" : options.language}
					disabled={extracting}
					items={languages.map((language) => ({
						value: language,
						label: LANGUAGE_LABELS[language],
					}))}
					onChange={(language) =>
						onChange({ language: language as GenerationOptions["language"] })
					}
				/>
				<OptionSelect
					label="Nível de habilidade"
					value={options.level}
					disabled={extracting}
					items={SKILL_LEVELS.map((level) => ({
						value: level,
						label: LEVEL_LABELS[level],
					}))}
					onChange={(level) =>
						onChange({ level: level as GenerationOptions["level"] })
					}
				/>
				<OptionSelect
					label="Duração do quiz"
					value={extracting ? "auto" : String(options.count)}
					disabled={extracting}
					items={
						extracting
							? [{ value: "auto", label: "Auto" }]
							: GENERATION_COUNTS.map((count) => ({
									value: String(count),
									label: countLabel(count),
								}))
					}
					onChange={(count) =>
						onChange({
							count: Number(count) as GenerationOptions["count"],
						})
					}
				/>
				<p className="text-muted-foreground text-sm">
					{remainingLabel(remaining)}
				</p>
			</div>
			<div className="mt-auto flex flex-col gap-2 border-border border-t p-4 max-lg:flex-row max-lg:p-3 max-lg:[&>*]:flex-1">
				<ActionButton
					variant="outline"
					className="h-11"
					unavailableReason={addReason}
					onClick={onAdd}
				>
					{`Adicionar (${checkedCount})`}
				</ActionButton>
				<ActionButton
					variant="outline"
					className="h-11"
					unavailableReason={addAllReason}
					onClick={onAddAll}
				>
					Adicionar tudo
				</ActionButton>
			</div>
		</div>
	);
}

function OptionSelect({
	label,
	value,
	items,
	disabled = false,
	onChange,
}: {
	label: string;
	value: string;
	items: { value: string; label: string }[];
	disabled?: boolean;
	onChange: (value: string) => void;
}) {
	const labelId = useId();
	return (
		<div className="flex flex-col gap-2">
			<span id={labelId} className="font-bold text-sm">
				{label}
			</span>
			<Select
				items={items}
				value={value}
				disabled={disabled}
				onValueChange={(next) => onChange(next as string)}
			>
				<SelectTrigger
					aria-labelledby={labelId}
					aria-disabled={disabled || undefined}
					className="h-11"
				>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{items.map((item) => (
						<SelectItem key={item.value} value={item.value}>
							{item.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
