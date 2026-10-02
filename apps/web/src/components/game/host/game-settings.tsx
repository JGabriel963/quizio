import { Button } from "@quizio/ui/components/button";
import {
	Sheet,
	SheetBody,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@quizio/ui/components/sheet";
import { Switch } from "@quizio/ui/components/switch";
import {
	ListOrderedIcon,
	LockIcon,
	type LucideIcon,
	PowerIcon,
	ShuffleIcon,
	SmartphoneIcon,
} from "lucide-react";
import { useId, useState } from "react";

import type { GameOptionsData } from "@/lib/api-types";

import { EndGameDialog } from "./lobby-dialogs";

/** Why the random orders cannot change during the game (spec 012, RN-25). */
const ONLY_BEFORE_START = "Só antes de iniciar a partida.";

/**
 * "Configurações", opened from the gear of the host's header, in the lobby
 * and during the game (spec 012, RN-01 to RN-07). Each switch takes effect at
 * once; the game behind the panel keeps running. Its last line ends the game,
 * after the same question the exit button asks (spec 013, RN-01, RN-02).
 */
export function GameSettings({
	open,
	onOpenChange,
	options,
	locked,
	playing,
	onOptionsChange,
	onLockedChange,
	onEnd,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	options: GameOptionsData;
	/** "Bloquear jogo" is the lobby's padlock (RN-08): it is not a saved option. */
	locked: boolean;
	/** The game has started: the random orders were already drawn (RN-25). */
	playing: boolean;
	/** Only the option that changed. */
	onOptionsChange: (change: Partial<GameOptionsData>) => void;
	onLockedChange: (locked: boolean) => void;
	/** "Encerrar agora", once confirmed. */
	onEnd: () => void;
}) {
	const [confirmingEnd, setConfirmingEnd] = useState(false);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>Configurações</SheetTitle>
				</SheetHeader>
				<SheetBody className="p-0">
					<ul className="divide-y">
						<Setting
							icon={SmartphoneIcon}
							name="Mostrar perguntas nos dispositivos"
							explanation="Perguntas e respostas são exibidas nos dispositivos dos participantes."
							checked={options.showQuestionsOnDevices}
							onChange={(showQuestionsOnDevices) =>
								onOptionsChange({ showQuestionsOnDevices })
							}
						/>
						<Setting
							icon={LockIcon}
							name="Bloquear jogo"
							explanation="Bloqueie o jogo para impedir que outros participantes entrem."
							checked={locked}
							onChange={onLockedChange}
						/>
						<Setting
							icon={ListOrderedIcon}
							name="Mostrar perguntas em ordem aleatória"
							explanation="As perguntas saem numa ordem sorteada a cada partida."
							checked={options.randomizeQuestions}
							disabledReason={playing ? ONLY_BEFORE_START : null}
							onChange={(randomizeQuestions) =>
								onOptionsChange({ randomizeQuestions })
							}
						/>
						<Setting
							icon={ShuffleIcon}
							name="Mostrar respostas em ordem aleatória"
							explanation="As alternativas trocam de posição a cada partida."
							checked={options.randomizeAnswers}
							disabledReason={playing ? ONLY_BEFORE_START : null}
							onChange={(randomizeAnswers) =>
								onOptionsChange({ randomizeAnswers })
							}
						/>
					</ul>
					<div className="flex items-center gap-4 border-t px-5 py-4">
						<PowerIcon
							aria-hidden="true"
							className="size-6 shrink-0 text-brand"
						/>
						<p className="min-w-0 flex-1 font-bold text-base">Encerrar jogo</p>
						<Button onClick={() => setConfirmingEnd(true)}>
							Encerrar agora
						</Button>
					</div>
				</SheetBody>
				<SheetFooter>
					Suas configurações serão salvas para a próxima vez.
				</SheetFooter>
				{/* Inside the panel: cancelling comes back to it (RN-02). */}
				<EndGameDialog
					open={confirmingEnd}
					onCancel={() => setConfirmingEnd(false)}
					onConfirm={() => {
						setConfirmingEnd(false);
						onEnd();
					}}
				/>
			</SheetContent>
		</Sheet>
	);
}

/** One line of the panel: icon, name, a sentence of explanation and the switch. */
function Setting({
	icon: Icon,
	name,
	explanation,
	checked,
	disabledReason = null,
	onChange,
}: {
	icon: LucideIcon;
	name: string;
	explanation: string;
	checked: boolean;
	/** Why the switch cannot be changed now; null while it can. */
	disabledReason?: string | null;
	onChange: (checked: boolean) => void;
}) {
	const id = useId();
	const nameId = `${id}-name`;
	const explanationId = `${id}-explanation`;

	return (
		<li className="flex items-center gap-4 px-5 py-4">
			<Icon aria-hidden="true" className="size-6 shrink-0 text-brand" />
			<div className="min-w-0 flex-1">
				<p id={nameId} className="font-bold text-base">
					{name}
				</p>
				<div id={explanationId} className="text-muted-foreground">
					<p>{explanation}</p>
					{disabledReason && (
						<p className="mt-1 font-semibold text-foreground">
							{disabledReason}
						</p>
					)}
				</div>
			</div>
			<Switch
				aria-labelledby={nameId}
				aria-describedby={explanationId}
				checked={checked}
				disabled={disabledReason !== null}
				// The primitive also passes the event: the caller gets only the value.
				onCheckedChange={(next) => onChange(next)}
			/>
		</li>
	);
}
