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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@quizio/ui/components/select";
import { Switch } from "@quizio/ui/components/switch";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@quizio/ui/components/tooltip";
import { CircleHelpIcon } from "lucide-react";
import { useEffect, useId, useState } from "react";

import type { AssignmentSetupData } from "@/components/assignment/assign-dialog";
import {
	deadlineBounds,
	defaultDeadline,
	hourLabel,
	hourOptions,
	isDayAllowed,
	onAllowedHour,
	withHour,
} from "@/lib/assignment-deadline";
import {
	assignmentErrorMessage,
	isDeadlineRefusal,
} from "@/lib/assignment-error-messages";
import type { AssignSettings } from "@/lib/group-assign-state";

type Options = AssignSettings["options"];

/** Kahoot's order in the group's dialog (spec 038, RN-07). */
const OPTION_ROWS: {
	key: keyof Options | "nicknameGenerator";
	name: string;
	explanation: string;
}[] = [
	{
		key: "questionTimer",
		name: "Timer da pergunta",
		explanation: "Conceda mais pontos para respostas mais rápidas.",
	},
	{
		key: "randomizeAnswers",
		name: "Ordem aleatória de respostas",
		explanation: "Exiba a ordem aleatória de respostas para cada participante.",
	},
	{
		key: "nicknameGenerator",
		name: "Gerador de apelido",
		explanation: "Evite apelidos inadequados e informações pessoais.",
	},
	{
		key: "gameCharacters",
		name: "Personagens",
		explanation:
			"Permita que os participantes escolham um personagem e personalizem sua aparência.",
	},
];

const dayLabel = new Intl.DateTimeFormat("pt-BR", {
	day: "numeric",
	month: "long",
	year: "numeric",
});

const dayKey = (day: Date) =>
	`${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;

/** The days from today to the last one the bounds allow. */
function allowedDays(now: Date, maxDays: number): Date[] {
	const bounds = deadlineBounds(now, maxDays);
	return Array.from(
		{ length: maxDays + 1 },
		(_, offset) =>
			new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset),
	).filter((day) => isDayAllowed(day, bounds));
}

/**
 * "Configurações da atividade atribuída" (spec 038, RN-07 to RN-10): the
 * deadline in two lists (a day and a full hour), the options, "Adicionar
 * mensagem", "Atribuir agora" and "Fechar". The rules are the spec 029's.
 */
export function AssignmentSettingsDialog({
	open,
	setup,
	now,
	onAssignNow,
	onAddMessage,
	onClose,
}: {
	open: boolean;
	/** Undefined while it loads. */
	setup: AssignmentSetupData | undefined;
	/** When the flow opened: the default and the bounds count from it. */
	now: Date;
	onAssignNow: (settings: AssignSettings) => Promise<unknown>;
	onAddMessage: (settings: AssignSettings) => void;
	onClose: () => void;
}) {
	const maxDays = setup?.maxDeadlineDays ?? 28;
	const bounds = deadlineBounds(now, maxDays);
	const days = allowedDays(now, maxDays);
	const [deadline, setDeadline] = useState(() => defaultDeadline(now));
	const [options, setOptions] = useState(setup?.options);
	const [failure, setFailure] = useState<string | null>(null);
	const [assigning, setAssigning] = useState(false);
	const dayLabelId = useId();
	const hourLabelId = useId();
	const hours = hourOptions(deadline, bounds);

	// What the creator chose last arrives with the setup (spec 029, RN-14).
	useEffect(() => {
		if (setup && !options) {
			setOptions(setup.options);
		}
	}, [setup, options]);

	async function assignNow() {
		if (!options || assigning) {
			return;
		}
		setAssigning(true);
		setFailure(null);
		try {
			await onAssignNow({ deadline, options });
		} catch (error) {
			setFailure(
				isDeadlineRefusal(error)
					? assignmentErrorMessage(error, undefined, maxDays)
					: assignmentErrorMessage(
							error,
							"Não foi possível atribuir a atividade. Tente novamente.",
							maxDays,
						),
			);
			setAssigning(false);
		}
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) {
					onClose();
				}
			}}
		>
			<DialogContent showCloseButton={false}>
				<DialogHeader>
					<DialogTitle>Configurações da atividade atribuída</DialogTitle>
				</DialogHeader>
				<div className="grid gap-3 sm:grid-cols-2">
					<div className="grid gap-1">
						<span id={dayLabelId} className="sr-only">
							Data
						</span>
						<Select
							items={days.map((day) => ({
								value: dayKey(day),
								label: dayLabel.format(day),
							}))}
							value={dayKey(deadline)}
							onValueChange={(key) => {
								const day = days.find((candidate) => dayKey(candidate) === key);
								if (day) {
									setDeadline(onAllowedHour(day, deadline.getHours(), bounds));
								}
							}}
						>
							<SelectTrigger aria-labelledby={dayLabelId} className="h-11">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{days.map((day) => (
									<SelectItem key={dayKey(day)} value={dayKey(day)}>
										{dayLabel.format(day)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="grid gap-1">
						<span id={hourLabelId} className="sr-only">
							Hora
						</span>
						<Select
							items={hours.map((hour) => ({
								value: hour,
								label: hourLabel(hour),
							}))}
							value={deadline.getHours()}
							onValueChange={(hour) =>
								setDeadline(withHour(deadline, hour as number))
							}
						>
							<SelectTrigger aria-labelledby={hourLabelId} className="h-11">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{hours.map((hour) => (
									<SelectItem key={hour} value={hour}>
										{hourLabel(hour)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
				<div className="grid gap-1">
					<h3 className="font-bold text-sm">Opções</h3>
					<ul className="divide-y">
						{OPTION_ROWS.map((row) => (
							<OptionRow
								key={row.key}
								name={row.name}
								explanation={row.explanation}
								checked={
									row.key === "nicknameGenerator"
										? false
										: (options?.[row.key] ?? false)
								}
								soon={row.key === "nicknameGenerator"}
								onChange={(checked) => {
									if (options && row.key !== "nicknameGenerator") {
										setOptions({ ...options, [row.key]: checked });
									}
								}}
							/>
						))}
					</ul>
				</div>
				{failure && (
					<p role="alert" className="font-semibold text-destructive text-sm">
						{failure}
					</p>
				)}
				<DialogFooter className="flex-col items-center gap-2 sm:flex-col">
					<div className="flex flex-wrap justify-center gap-2">
						<Button
							variant="secondary"
							disabled={!options}
							onClick={() => options && onAddMessage({ deadline, options })}
						>
							Adicionar mensagem
						</Button>
						<Button
							disabled={!options || assigning}
							aria-busy={assigning || undefined}
							onClick={assignNow}
						>
							Atribuir agora
						</Button>
					</div>
					<Button variant="ghost" onClick={onClose}>
						Fechar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function OptionRow({
	name,
	explanation,
	checked,
	soon,
	onChange,
}: {
	name: string;
	explanation: string;
	checked: boolean;
	soon: boolean;
	onChange: (checked: boolean) => void;
}) {
	const nameId = useId();
	return (
		<li className="flex items-center gap-2 py-2.5">
			<span id={nameId} className="text-sm">
				{name}
			</span>
			<Tooltip>
				<TooltipTrigger
					render={
						<button
							type="button"
							aria-label={explanation}
							className="text-muted-foreground"
						/>
					}
				>
					<CircleHelpIcon className="size-4" />
				</TooltipTrigger>
				<TooltipContent>{explanation}</TooltipContent>
			</Tooltip>
			{soon && <Badge variant="soon">Em breve</Badge>}
			<Switch
				className="ml-auto"
				aria-labelledby={nameId}
				checked={checked}
				disabled={soon}
				aria-disabled={soon || undefined}
				onCheckedChange={(next) => onChange(next)}
			/>
		</li>
	);
}
