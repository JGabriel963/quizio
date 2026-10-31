import type { Avatar as AvatarValue } from "@quizio/core/game/domain/avatar";
import { NICKNAME_MAX_LENGTH } from "@quizio/core/game/domain/nickname";
import { Button } from "@quizio/ui/components/button";
import { UserRoundIcon } from "lucide-react";
import { type ReactNode, useId, useState } from "react";

import { Avatar } from "@/components/game/avatar";
import { GameScreen, Wordmark } from "@/components/game/game-screen";
import { AvatarEditor } from "@/components/game/player/avatar-editor";
import { JoinNotice } from "@/components/game/player/join-forms";
import { LegalConsent } from "@/components/legal/legal-consent";
import { QuizCover } from "@/components/quiz/quiz-cover";
import type { OpenAssignmentCoverData } from "@/lib/api-types";
import { questionCountLabel } from "@/lib/quiz-labels";
import { openFor } from "@/lib/time-until";

const fieldClass =
	"h-12 w-full rounded border-2 border-neutral-300 bg-white px-3 text-center font-bold text-lg text-neutral-800 outline-none placeholder:font-semibold placeholder:text-neutral-500 focus-visible:border-neutral-800";

/** The translucent card all the entry screens sit in, as in Kahoot. */
function Card({
	children,
	header,
}: {
	children: ReactNode;
	header?: ReactNode;
}) {
	return (
		<GameScreen className="flex min-h-svh flex-col items-center p-4 pb-20">
			<div className="flex w-full max-w-3xl flex-1 flex-col overflow-hidden rounded-lg bg-white/10 shadow-xl backdrop-blur-sm">
				{header}
				<div className="flex flex-1 flex-col items-center gap-6 px-4 py-8">
					{children}
				</div>
			</div>
		</GameScreen>
	);
}

/** "Atividade por Ana · Aberto por 2 dias" (spec 029, RN-46). */
export function ActivityHeader({
	creatorName,
	remainingMs,
}: {
	creatorName: string;
	remainingMs: number | null;
}) {
	return (
		<header className="flex flex-wrap items-center justify-between gap-2 bg-game-bar px-5 py-3 text-sm text-white sm:text-base">
			<p>
				<strong>Atividade</strong> por {creatorName}
			</p>
			{remainingMs !== null && (
				<p className="font-semibold">{openFor(remainingMs)}</p>
			)}
		</header>
	);
}

/** What the link opens (spec 030, RN-01): the cover, the questions, the name and "Iniciar". */
export function AssignmentCover({
	cover,
	onStart,
}: {
	cover: OpenAssignmentCoverData;
	onStart: () => void;
}) {
	return (
		<Card>
			<Wordmark className="text-4xl opacity-60" />
			<div className="relative w-full max-w-sm">
				<QuizCover url={cover.coverUrl} className="w-full" />
				<span className="absolute right-2 bottom-2 rounded bg-black/70 px-2 py-0.5 font-semibold text-sm text-white">
					{questionCountLabel(cover.questionCount)}
				</span>
			</div>
			<h1 className="text-center font-black text-2xl">{cover.name}</h1>
			<Button
				variant="game"
				size="lg"
				className="mt-auto w-full max-w-sm"
				onClick={onStart}
			>
				Iniciar
			</Button>
		</Card>
	);
}

/** The nickname (spec 030, RN-02 to RN-04): the screen of spec 029, now working. */
export function NicknameStep({
	cover,
	busy,
	notice,
	onSubmit,
}: {
	cover: OpenAssignmentCoverData;
	busy: boolean;
	/** Why the server refused the last nickname; null otherwise. */
	notice: string | null;
	onSubmit: (nickname: string) => void;
}) {
	const id = useId();
	const [nickname, setNickname] = useState("");

	return (
		<Card
			header={
				<ActivityHeader
					creatorName={cover.creatorName}
					remainingMs={cover.remainingMs}
				/>
			}
		>
			<Wordmark className="text-5xl" />
			<h1 className="text-center font-black text-2xl">{cover.name}</h1>
			<p className="inline-flex items-center gap-2 rounded bg-game-chip px-3 py-1 font-semibold text-game-chip-fg">
				<UserRoundIcon aria-hidden="true" className="size-4" />
				{cover.participantCount}{" "}
				{cover.participantCount === 1 ? "participante" : "participantes"}
			</p>
			{/* Only to see: a nickname is no way in (RN-03). */}
			{cover.participants.length > 0 && (
				<ul
					aria-label="Quem já entrou"
					className="flex max-w-xl flex-wrap justify-center gap-2"
				>
					{cover.participants.map((nickname) => (
						<li
							key={nickname}
							className="rounded-md bg-game-chip px-4 py-2 font-black text-game-chip-fg text-lg shadow-press-sm"
						>
							{nickname}
						</li>
					))}
				</ul>
			)}
			<form
				className="mt-auto flex w-full max-w-sm flex-col gap-3"
				onSubmit={(event) => {
					event.preventDefault();
					if (nickname.trim() === "" || busy) {
						return;
					}
					onSubmit(nickname);
				}}
			>
				<label htmlFor={id} className="sr-only">
					Insira um apelido
				</label>
				<input
					id={id}
					placeholder="Insira um apelido"
					autoComplete="off"
					maxLength={NICKNAME_MAX_LENGTH * 2}
					value={nickname}
					onChange={(event) => setNickname(event.target.value)}
					className={fieldClass}
				/>
				<Button type="submit" variant="game" size="lg" disabled={busy}>
					Ok, vamos lá!
				</Button>
				<p className="self-center rounded bg-white/90 px-2 py-1 text-neutral-800 text-sm">
					Não use seu nome verdadeiro
				</p>
				<LegalConsent
					action="entrar na atividade"
					className="self-center rounded bg-white/90 px-2 py-1 text-center text-neutral-800"
				/>
			</form>
			<JoinNotice message={notice} />
		</Card>
	);
}

/** The character before "Começar", with "Personagens" on (spec 030, RN-06). */
export function ReadyScreen({
	nickname,
	avatar,
	busy,
	onChange,
	onStart,
}: {
	nickname: string;
	avatar: AvatarValue;
	busy: boolean;
	/** Rejects when the change was not saved. */
	onChange: (avatar: AvatarValue) => Promise<void>;
	onStart: () => void;
}) {
	const [editing, setEditing] = useState(false);

	return (
		<Card>
			<Avatar avatar={avatar} animateOnChange className="size-40" />
			<p className="font-black text-2xl">{nickname}</p>
			<Button variant="secondary" onClick={() => setEditing(true)}>
				Trocar personagem
			</Button>
			<Button
				variant="game"
				size="lg"
				className="mt-auto w-full max-w-sm"
				disabled={busy}
				onClick={onStart}
			>
				Começar
			</Button>
			<AvatarEditor
				open={editing}
				avatar={avatar}
				onChange={onChange}
				onClose={() => setEditing(false)}
			/>
		</Card>
	);
}

/**
 * "Você é {apelido}?" (spec 030, RN-03, RN-20): coming back, or choosing a
 * nickname already in the activity. "Sim" takes that participant back up,
 * where they were; "Não" goes to the nickname to start as somebody else.
 */
export function ConfirmParticipant({
	nickname,
	onYes,
	onNo,
}: {
	nickname: string;
	onYes: () => void;
	onNo: () => void;
}) {
	return (
		<Card>
			<div className="my-auto flex w-full max-w-md flex-col items-center gap-4 text-center motion-safe:animate-pop-in">
				<h1 className="font-black text-2xl">Você é {nickname}?</h1>
				<p className="font-semibold">
					Um jogador com esse apelido já começou o jogo. Se foi você, continue
					jogando de onde parou ou comece a jogar com um apelido diferente.
				</p>
				<Button
					variant="secondary"
					size="lg"
					className="w-full"
					onClick={onYes}
				>
					Sim
				</Button>
				<Button
					variant="outline"
					size="lg"
					className="w-full border-game-fg bg-transparent text-game-fg hover:bg-game-chip"
					onClick={onNo}
				>
					Não
				</Button>
			</div>
		</Card>
	);
}
