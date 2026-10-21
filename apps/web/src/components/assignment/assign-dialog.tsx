import { Badge } from "@quizio/ui/components/badge";
import { Button } from "@quizio/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@quizio/ui/components/dialog";
import { Switch } from "@quizio/ui/components/switch";
import { cn } from "@quizio/ui/lib/utils";
import {
	CalendarIcon,
	ChevronDownIcon,
	type LucideIcon,
	SettingsIcon,
	ShuffleIcon,
	TimerIcon,
	UserRoundIcon,
	WandSparklesIcon,
} from "lucide-react";
import { useEffect, useId, useState } from "react";

import {
	deadlineBounds,
	defaultDeadline,
	formatDeadlineLong,
} from "@/lib/assignment-deadline";
import {
	assignmentErrorMessage,
	isDeadlineRefusal,
} from "@/lib/assignment-error-messages";
import { timeUntil } from "@/lib/time-until";

import { DeadlinePicker } from "./deadline-picker";

export interface AssignmentOptionsData {
	gameCharacters: boolean;
	questionTimer: boolean;
	randomizeAnswers: boolean;
}

export interface AssignmentSetupData {
	options: AssignmentOptionsData;
	maxDeadlineDays: number;
}

const OPTION_ROWS: {
	key: keyof AssignmentOptionsData;
	icon: LucideIcon;
	name: string;
	explanation: string;
}[] = [
	{
		key: "gameCharacters",
		icon: UserRoundIcon,
		name: "Personagens",
		explanation:
			"Permita que os participantes escolham um personagem e personalizem sua aparência.",
	},
	{
		key: "questionTimer",
		icon: TimerIcon,
		name: "Timer da pergunta",
		explanation: "Conceda mais pontos para respostas mais rápidas.",
	},
	{
		key: "randomizeAnswers",
		icon: ShuffleIcon,
		name: "Ordem aleatória de respostas",
		explanation: "Exiba a ordem aleatória de respostas para cada participante.",
	},
];

/** "Em 3 dias": the card's first letter is a capital. */
function capitalized(text: string): string {
	return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * "Configurar atividade" (spec 029, RN-06 to RN-17): the deadline, "Mais
 * opções" and "Criar uma tarefa". The caller creates the assignment; a
 * refused deadline keeps the dialog open with the reason on its card.
 */
export function AssignDialog({
	open,
	onOpenChange,
	setup,
	now,
	onCreate,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Undefined while it loads. */
	setup: AssignmentSetupData | undefined;
	/** When the dialog opened: the default and the bounds count from it. */
	now: Date;
	onCreate: (input: {
		deadline: Date;
		options: AssignmentOptionsData;
	}) => Promise<void>;
}) {
	const maxDays = setup?.maxDeadlineDays ?? 28;
	const bounds = deadlineBounds(now, maxDays);
	const [deadline, setDeadline] = useState(() => defaultDeadline(now));
	const [options, setOptions] = useState(setup?.options);
	const [editing, setEditing] = useState(false);
	const [moreOpen, setMoreOpen] = useState(false);
	const [deadlineError, setDeadlineError] = useState<string | null>(null);
	const [failure, setFailure] = useState<string | null>(null);
	const [creating, setCreating] = useState(false);
	const moreId = useId();

	// What the creator chose last arrives with the setup (RN-14).
	useEffect(() => {
		if (setup && !options) {
			setOptions(setup.options);
		}
	}, [setup, options]);

	async function create() {
		if (!options || creating) {
			return;
		}
		setCreating(true);
		setDeadlineError(null);
		setFailure(null);
		try {
			await onCreate({ deadline, options });
		} catch (error) {
			if (isDeadlineRefusal(error)) {
				setDeadlineError(assignmentErrorMessage(error, undefined, maxDays));
			} else {
				setFailure(
					assignmentErrorMessage(
						error,
						"Não foi possível criar a atividade. Tente novamente.",
						maxDays,
					),
				);
			}
		} finally {
			setCreating(false);
		}
	}

	const remainingMs = deadline.getTime() - now.getTime();

	return (
		<Dialog open={open} onOpenChange={(next) => onOpenChange(next)}>
			<DialogContent className="sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>Configurar atividade</DialogTitle>
					<DialogDescription>
						Crie uma atividade e a compartilhe com os participantes na próxima
						etapa.
					</DialogDescription>
				</DialogHeader>

				{editing ? (
					<DeadlinePicker
						value={deadline}
						bounds={bounds}
						onApply={(next) => {
							setDeadline(next);
							setDeadlineError(null);
							setEditing(false);
						}}
						onCancel={() => setEditing(false)}
					/>
				) : (
					<div className="flex flex-col gap-2">
						<div
							className={cn(
								"flex items-center gap-4 rounded-md border bg-muted/40 px-4 py-3",
								deadlineError && "border-destructive",
							)}
						>
							<CalendarIcon aria-hidden="true" className="size-6 shrink-0" />
							<div className="min-w-0 flex-1">
								<p className="text-sm">
									Data de término ·{" "}
									<span className="text-muted-foreground">
										{capitalized(timeUntil(Math.max(0, remainingMs)))}
									</span>
								</p>
								<p className="font-bold">{formatDeadlineLong(deadline)}</p>
								{deadlineError && (
									<p className="mt-1 font-semibold text-destructive text-sm">
										{deadlineError}
									</p>
								)}
							</div>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setEditing(true)}
							>
								Editar
							</Button>
						</div>

						<div className="rounded-md border">
							<button
								type="button"
								aria-expanded={moreOpen}
								aria-controls={moreId}
								onClick={() => setMoreOpen(!moreOpen)}
								className="flex w-full items-center gap-4 px-4 py-3 text-left font-bold outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
							>
								<SettingsIcon aria-hidden="true" className="size-6 shrink-0" />
								<span className="flex-1">Mais opções</span>
								<ChevronDownIcon
									aria-hidden="true"
									className={cn(
										"size-5 transition-transform",
										moreOpen && "rotate-180",
									)}
								/>
							</button>
							{moreOpen && (
								<ul id={moreId} className="divide-y border-t">
									<OptionRow
										icon={WandSparklesIcon}
										name="Gerador de apelido"
										explanation="Evite apelidos inadequados e informações pessoais."
										checked={false}
										soon
									/>
									{OPTION_ROWS.map((row) => (
										<OptionRow
											key={row.key}
											icon={row.icon}
											name={row.name}
											explanation={row.explanation}
											checked={options?.[row.key] ?? false}
											onChange={(checked) =>
												options &&
												setOptions({ ...options, [row.key]: checked })
											}
										/>
									))}
								</ul>
							)}
						</div>
					</div>
				)}

				{failure && (
					<p role="alert" className="font-semibold text-destructive text-sm">
						{failure}
					</p>
				)}

				{!editing && (
					<DialogFooter className="sm:justify-center">
						<Button variant="secondary" onClick={() => onOpenChange(false)}>
							Cancelar
						</Button>
						<Button
							disabled={creating || !options}
							aria-busy={creating || undefined}
							onClick={create}
						>
							{creating ? "Criando…" : "Criar uma tarefa"}
						</Button>
					</DialogFooter>
				)}
			</DialogContent>
		</Dialog>
	);
}

function OptionRow({
	icon: Icon,
	name,
	explanation,
	checked,
	onChange,
	soon = false,
}: {
	icon: LucideIcon;
	name: string;
	explanation: string;
	checked: boolean;
	onChange?: (checked: boolean) => void;
	/** "Em breve": visible, off and not available (spec 029, RN-12, RN-51). */
	soon?: boolean;
}) {
	const id = useId();
	const nameId = `${id}-name`;
	const explanationId = `${id}-explanation`;

	return (
		<li className="flex items-center gap-4 px-4 py-3">
			<Icon
				aria-hidden="true"
				className="size-5 shrink-0 text-muted-foreground"
			/>
			<div className="min-w-0 flex-1">
				<p className="flex flex-wrap items-center gap-2">
					<span id={nameId} className="font-semibold">
						{name}
					</span>
					{soon && <Badge variant="soon">Em breve</Badge>}
				</p>
				<p id={explanationId} className="text-muted-foreground text-sm">
					{explanation}
				</p>
			</div>
			<Switch
				aria-labelledby={nameId}
				aria-describedby={explanationId}
				checked={checked}
				disabled={soon}
				aria-disabled={soon || undefined}
				onCheckedChange={(next) => onChange?.(next)}
			/>
		</li>
	);
}
