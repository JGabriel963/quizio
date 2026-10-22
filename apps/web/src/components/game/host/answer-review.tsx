import { Button } from "@quizio/ui/components/button";
import { cn } from "@quizio/ui/lib/utils";
import { CheckIcon, InfoIcon, LoaderCircleIcon, XIcon } from "lucide-react";
import { useState } from "react";

import type { TypedAnswerGroupData } from "@/lib/api-types";

/** A mark of the host: the answers of `key` are now correct or not (RN-29). */
export interface ReviewMark {
	key: string;
	correct: boolean;
}

/**
 * "Revisar respostas" (spec 031, RN-27 to RN-29): the answers sent, in two
 * lanes. Clicking a sent answer moves it to the other lane and leaves its
 * place empty; clicking it again puts it back. The accepted answers of the
 * editor stay correct. "Enviar" sends the marks; "Cancelar" sends nothing.
 */
export function AnswerReview({
	questionText,
	groups,
	busy,
	error,
	onSubmit,
	onCancel,
}: {
	questionText: string;
	/** Null while the list is on its way. */
	groups: TypedAnswerGroupData[] | null;
	busy: boolean;
	error: string | null;
	onSubmit: (marks: ReviewMark[]) => void;
	onCancel: () => void;
}) {
	/** Keys whose lane the host switched. */
	const [switched, setSwitched] = useState<ReadonlySet<string>>(new Set());
	const toggle = (key: string) =>
		setSwitched((current) => {
			const next = new Set(current);
			if (!next.delete(key)) {
				next.add(key);
			}
			return next;
		});
	const isCorrect = (group: TypedAnswerGroupData) =>
		group.correct !== switched.has(group.key);
	const all = groups ?? [];

	return (
		<section
			aria-label="Revisar respostas"
			className="absolute inset-0 z-20 flex flex-col gap-4 bg-black/60 p-4 backdrop-blur-sm"
		>
			<div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-[1fr_minmax(0,40rem)_1fr]">
				<h1 className="rounded-md bg-white px-4 py-3 text-center font-bold text-2xl text-neutral-900 shadow-lg sm:col-start-2">
					{questionText}
				</h1>
				<div className="flex flex-col items-end gap-2">
					<Button
						variant="secondary"
						disabled={busy || switched.size === 0}
						onClick={() =>
							onSubmit(
								[...switched].flatMap((key) => {
									const group = all.find((entry) => entry.key === key);
									return group ? [{ key, correct: !group.correct }] : [];
								}),
							)
						}
					>
						{busy && (
							<LoaderCircleIcon
								data-icon="inline-start"
								aria-hidden="true"
								className="animate-spin"
							/>
						)}
						Enviar
					</Button>
					<Button variant="game" disabled={busy} onClick={onCancel}>
						Cancelar
					</Button>
				</div>
			</div>
			<p className="mx-auto flex items-center gap-2 rounded-sm bg-white/90 px-3 py-1 text-neutral-700 text-sm">
				<InfoIcon aria-hidden="true" className="size-4" />
				Clique nas respostas para marcá-las como corretas ou incorretas
			</p>
			{error && (
				<p role="alert" className="mx-auto font-bold text-destructive">
					{error}
				</p>
			)}
			{groups === null ? (
				<div className="flex flex-1 items-center justify-center">
					<LoaderCircleIcon
						role="status"
						aria-label="Carregando respostas"
						className="size-8 animate-spin"
					/>
				</div>
			) : (
				// The rows keep their own height (no stretching to the screen), and
				// the padding keeps a marked tag's ring inside the scroll area.
				<div className="grid min-h-0 flex-1 grid-cols-[auto_1fr] content-start items-start gap-x-6 gap-y-8 overflow-y-auto p-2">
					<Lane correct />
					<ul aria-label="Respostas corretas" className="flex flex-wrap gap-3">
						{groups.map((group) => (
							<Slot
								key={group.key}
								group={group}
								lane
								current={isCorrect(group)}
								onToggle={toggle}
							/>
						))}
					</ul>
					<Lane correct={false} />
					<div className="flex flex-col gap-3">
						{groups.some((group) => group.similar) && (
							<div className="w-fit rounded-sm bg-white p-3">
								<p className="mb-2 text-neutral-700 text-sm">
									Parecidas com as respostas corretas
								</p>
								<ul
									aria-label="Parecidas com as respostas corretas"
									className="flex flex-wrap gap-3"
								>
									{groups
										.filter((group) => group.similar)
										.map((group) => (
											<Slot
												key={group.key}
												group={group}
												lane={false}
												current={isCorrect(group)}
												onToggle={toggle}
											/>
										))}
								</ul>
							</div>
						)}
						<ul
							aria-label="Respostas incorretas"
							className="flex flex-wrap gap-3"
						>
							{groups
								.filter((group) => !group.similar)
								.map((group) => (
									<Slot
										key={group.key}
										group={group}
										lane={false}
										current={isCorrect(group)}
										onToggle={toggle}
									/>
								))}
						</ul>
					</div>
				</div>
			)}
		</section>
	);
}

function Lane({ correct }: { correct: boolean }) {
	const Mark = correct ? CheckIcon : XIcon;
	return (
		<div className="flex flex-col gap-2 font-bold text-lg">
			{correct ? "Respostas corretas" : "Respostas incorretas"}
			<span
				className={cn(
					"flex size-10 items-center justify-center rounded-full",
					correct ? "bg-success" : "bg-destructive",
				)}
			>
				<Mark aria-hidden="true" className="size-6 stroke-3" />
			</span>
		</div>
	);
}

/**
 * A group's place in a lane (RN-29): the tag while the group is in it, with a
 * contour and a mark when the host moved it there; an empty box where a moved
 * group was; nothing otherwise. The editor's accepted answers never move.
 */
function Slot({
	group,
	lane,
	current,
	onToggle,
}: {
	group: TypedAnswerGroupData;
	/** Which lane this is: the correct one or not. */
	lane: boolean;
	/** Where the group is now. */
	current: boolean;
	onToggle: (key: string) => void;
}) {
	if (current !== lane) {
		return group.correct === lane ? (
			<li
				aria-hidden="true"
				data-slot="review-gap"
				className="h-11 w-24 rounded-sm bg-white"
			/>
		) : null;
	}
	const moved = current !== group.correct;
	return (
		<li>
			<button
				type="button"
				disabled={group.accepted}
				aria-pressed={group.accepted ? undefined : moved}
				onClick={() => onToggle(group.key)}
				className={cn(
					"relative flex items-center gap-1 rounded-sm px-4 py-2 font-black text-lg text-white shadow-md disabled:cursor-default",
					group.accepted ? "bg-answer-red" : "bg-answer-yellow",
					moved && "ring-2 ring-white",
				)}
			>
				{moved && <CheckIcon aria-hidden="true" className="size-4 stroke-3" />}
				{group.text}
				<span className="absolute top-0.5 right-1 text-xs">{group.count}</span>
			</button>
		</li>
	);
}
