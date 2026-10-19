import type { Avatar as AvatarValue } from "@quizio/core/game/domain/avatar";
import { NICKNAME_MAX_LENGTH } from "@quizio/core/game/domain/nickname";
import { Button } from "@quizio/ui/components/button";
import { UserRoundIcon } from "lucide-react";
import { type ReactNode, useId, useState } from "react";

import { Avatar } from "@/components/game/avatar";
import { GameScreen, Wordmark } from "@/components/game/game-screen";
import { AvatarEditor } from "@/components/game/player/avatar-editor";
import { JoinNotice } from "@/components/game/player/join-forms";
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
		<header className="flex flex-wrap items-center justify-between gap-2 bg-black/30 px-5 py-3 text-sm sm:text-base">
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
				<span className="absolute right-2 bottom-2 rounded bg-black/70 px-2 py-0.5 font-semibold text-sm">
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
			<p className="inline-flex items-center gap-2 rounded bg-black/40 px-3 py-1 font-semibold">
				<UserRoundIcon aria-hidden="true" className="size-4" />
				{cover.participantCount}{" "}
				{cover.participantCount === 1 ? "participante" : "participantes"}
			</p>
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
