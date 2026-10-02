import { GAME_PIN_LENGTH } from "@quizio/core/game/domain/game-pin";
import { NICKNAME_MAX_LENGTH } from "@quizio/core/game/domain/nickname";
import { truncateCharacters } from "@quizio/core/shared/domain/text-length";
import { Button } from "@quizio/ui/components/button";
import { cn } from "@quizio/ui/lib/utils";
import { ArrowRightIcon, CircleAlertIcon } from "lucide-react";
import { type ReactNode, useId, useState } from "react";

import { GameScreen, Wordmark } from "../game-screen";

const fieldClass =
	"h-12 w-full rounded border-2 border-neutral-300 bg-white px-3 text-center font-bold text-lg text-neutral-800 outline-none placeholder:font-semibold placeholder:text-neutral-500 focus-visible:border-neutral-800 aria-invalid:border-destructive aria-invalid:bg-destructive/5";

/** The frame of the PIN and nickname steps, as in Kahoot's join screen. */
function JoinCard({
	children,
	notice,
	footer,
}: {
	children: ReactNode;
	notice: string | null;
	footer?: ReactNode;
}) {
	return (
		<GameScreen className="flex flex-col items-center justify-center gap-8 p-4 pb-24">
			<Wordmark className="text-6xl" />
			{children}
			{footer}
			<JoinNotice message={notice} />
		</GameScreen>
	);
}

/** The red strip at the bottom of the player's screen (spec 008, Experiência). */
export function JoinNotice({ message }: { message: string | null }) {
	return (
		<p
			role="alert"
			className={cn(
				"fixed inset-x-0 bottom-0 flex items-center gap-3 bg-destructive px-4 py-3 font-semibold text-white",
				!message && "hidden",
			)}
		>
			<CircleAlertIcon aria-hidden="true" className="size-5 shrink-0" />
			{message}
		</p>
	);
}

/** The first step: the game PIN (spec 008, RN-35, RN-36, RN-38). */
export function PinForm({
	notice,
	invalid,
	busy,
	onSubmit,
}: {
	notice: string | null;
	/** The last PIN sent was not recognized: the field turns red. */
	invalid: boolean;
	busy: boolean;
	onSubmit: (pin: string) => void;
}) {
	const id = useId();
	const [pin, setPin] = useState("");
	// The red field is about the PIN that was sent, not the one being typed.
	const [touched, setTouched] = useState(false);

	return (
		<JoinCard notice={notice}>
			<form
				className="flex w-full max-w-xs flex-col gap-3 rounded-md bg-white p-4 shadow-lg"
				onSubmit={(event) => {
					event.preventDefault();
					if (pin === "" || busy) {
						return;
					}
					setTouched(false);
					onSubmit(pin);
				}}
			>
				<label
					htmlFor={id}
					className="text-center font-bold text-neutral-800 text-sm"
				>
					PIN
				</label>
				<input
					id={id}
					name="pin"
					inputMode="numeric"
					autoComplete="off"
					placeholder="Inserir PIN"
					aria-invalid={invalid && !touched}
					value={pin}
					onChange={(event) => {
						setTouched(true);
						setPin(
							event.target.value.replace(/\D/g, "").slice(0, GAME_PIN_LENGTH),
						);
					}}
					className={fieldClass}
				/>
				<Button type="submit" variant="game" size="lg" disabled={busy}>
					Entrar
				</Button>
			</form>
		</JoinCard>
	);
}

/**
 * In place of the PIN, for who left a game that is still on: the way back as
 * the same player, or another PIN (spec 008, RN-44a).
 */
export function RejoinForm({
	nickname,
	busy,
	onRejoin,
	onOtherPin,
}: {
	nickname: string;
	busy: boolean;
	onRejoin: () => void;
	onOtherPin: () => void;
}) {
	return (
		<JoinCard notice={null}>
			<div className="flex w-full max-w-xs flex-col gap-3 rounded-md bg-white p-4 shadow-lg">
				<Button
					variant="game"
					size="lg"
					disabled={busy}
					onClick={onRejoin}
					className="h-auto min-h-12 whitespace-normal break-all"
				>
					Voltar como {nickname}
					<ArrowRightIcon aria-hidden="true" />
				</Button>
				<Button
					variant="ghost"
					disabled={busy}
					onClick={onOtherPin}
					// The card is white inside the dark game screen.
					className="text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900"
				>
					Entrar com outro PIN
				</Button>
			</div>
		</JoinCard>
	);
}

/** The second step: the nickname (spec 008, RN-40, RN-41). */
export function NicknameForm({
	error,
	busy,
	onSubmit,
}: {
	error: string | null;
	busy: boolean;
	onSubmit: (nickname: string) => void;
}) {
	const id = useId();
	const [nickname, setNickname] = useState("");

	return (
		<JoinCard
			notice={error}
			footer={<p className="font-semibold">Não use seu nome verdadeiro</p>}
		>
			<form
				className="flex w-full max-w-xs flex-col gap-3 rounded-md bg-white p-4 shadow-lg"
				onSubmit={(event) => {
					event.preventDefault();
					if (nickname.trim() === "" || busy) {
						return;
					}
					onSubmit(nickname);
				}}
			>
				<label
					htmlFor={id}
					className="text-center font-bold text-neutral-800 text-sm"
				>
					Apelido
				</label>
				<input
					id={id}
					name="nickname"
					autoComplete="off"
					autoCapitalize="off"
					placeholder="Insira seu apelido"
					value={nickname}
					onChange={(event) =>
						setNickname(
							truncateCharacters(event.target.value, NICKNAME_MAX_LENGTH),
						)
					}
					className={fieldClass}
				/>
				<Button type="submit" variant="game" size="lg" disabled={busy}>
					Ok, vamos lá!
				</Button>
			</form>
		</JoinCard>
	);
}

/** In: the nickname, waiting for the host to start (spec 008, RN-43). */
export function WaitingScreen({ nickname }: { nickname: string }) {
	return (
		<GameScreen className="flex flex-col items-center justify-center gap-6 p-6 text-center">
			<h1
				data-slot="player-nickname"
				className="break-all font-black text-5xl sm:text-6xl"
			>
				{nickname}
			</h1>
			<p className="font-bold text-xl">
				Pronto! Está vendo seu apelido na tela?
			</p>
		</GameScreen>
	);
}

/** While a join link or a reload is being checked with the server. */
export function JoinLoading() {
	return (
		<GameScreen className="flex flex-col items-center justify-center gap-6 p-6">
			<Wordmark className="text-6xl" />
			<p role="status" className="font-bold text-xl">
				Carregando…
			</p>
		</GameScreen>
	);
}
