import type { ThemeLookView } from "@quizio/core/shared/application/theme-look-view";
import { DEFAULT_THEME_ID } from "@quizio/core/shared/domain/theme";
import {
	ANSWER_COLOR_CLASSES,
	AnswerShape,
	answerShapeAt,
} from "@quizio/ui/components/answer-shape";
import { cn } from "@quizio/ui/lib/utils";
import { type ReactNode, useState } from "react";

import { GameScreen, Wordmark } from "@/components/game/game-screen";
import { GameThemeProvider, useGameTheme } from "@/lib/game-theme";

const SLIDES = [
	{ name: "Lobby", dot: "Mostrar o lobby" },
	{ name: "Pergunta", dot: "Mostrar a pergunta" },
	{ name: "Pódio", dot: "Mostrar o pódio" },
] as const;
export type PreviewSlide = (typeof SLIDES)[number]["name"];

const ANSWERS = ["Brasília", "Rio de Janeiro", "Salvador", "São Paulo"];

/**
 * "Crie seu tema"'s preview (spec 043, RN-14), as Kahoot's: the host's screen
 * with the phone beside it, on the lobby, a question or the podium, chosen
 * with the dots below. It wears the look being made, with made-up players.
 */
export function ThemePreview({
	look,
	slide,
	onSlideChange,
}: {
	look: ThemeLookView;
	/** Controlled when given: the dialog shows where a part appears. */
	slide?: PreviewSlide;
	onSlideChange?: (slide: PreviewSlide) => void;
}) {
	const [own, setOwn] = useState<PreviewSlide>("Lobby");
	const shown = slide ?? own;
	const setShown = (next: PreviewSlide) => {
		setOwn(next);
		onSlideChange?.(next);
	};
	return (
		<GameThemeProvider themeId={DEFAULT_THEME_ID} custom={look}>
			<div className="flex flex-col items-center gap-3">
				<Slide name="Lobby" shown={shown}>
					<Devices
						screen={
							<>
								<span className="flex items-center gap-2 rounded-sm bg-white px-2 py-1 text-black shadow">
									<span className="flex flex-col gap-0.5">
										<span className="h-1 w-10 rounded-full bg-neutral-300" />
										<span className="h-1 w-7 rounded-full bg-neutral-300" />
									</span>
									<span className="font-black text-sm">265 914</span>
								</span>
								<Wordmark className="text-2xl" />
								<span className="flex flex-wrap justify-center gap-1">
									{["Ana", "Bruno", "Carla", "Davi"].map((nickname) => (
										<span
											key={nickname}
											className="rounded-sm bg-game-accent px-1.5 font-bold text-[10px] text-game-accent-fg"
										>
											{nickname}
										</span>
									))}
								</span>
							</>
						}
						phone={
							<>
								<Wordmark className="text-sm" />
								<span className="h-3 w-4/5 rounded-sm bg-white" />
								<span className="h-3 w-4/5 rounded-sm bg-game-bar" />
							</>
						}
					/>
				</Slide>
				<Slide name="Pergunta" shown={shown}>
					<Devices
						screen={
							<>
								<span className="absolute top-1.5 left-2">
									<Wordmark className="text-[10px]" />
								</span>
								<span className="w-4/5 rounded-sm bg-white px-2 py-1 text-center font-bold text-[9px] text-black">
									Qual é a capital do Brasil?
								</span>
								<span className="rounded-full bg-game-chip px-1.5 font-bold text-[9px] text-game-chip-fg">
									20
								</span>
								<span className="grid w-11/12 grid-cols-2 gap-1">
									{ANSWERS.map((answer, index) => (
										<span
											key={answer}
											className={cn(
												"flex items-center gap-1 truncate rounded-sm px-1.5 py-1 font-bold text-[8px] text-white",
												ANSWER_COLOR_CLASSES[answerShapeAt(index)],
											)}
										>
											<AnswerShape
												shape={answerShapeAt(index)}
												className="size-2.5"
											/>
											{answer}
										</span>
									))}
								</span>
							</>
						}
						phone={
							<span className="grid h-full w-full grid-cols-2 gap-0.5 p-0.5">
								{ANSWERS.map((answer, index) => (
									<span
										key={answer}
										className={cn(
											"flex items-center justify-center rounded-sm text-white",
											ANSWER_COLOR_CLASSES[answerShapeAt(index)],
										)}
									>
										<AnswerShape
											shape={answerShapeAt(index)}
											className="size-3"
										/>
									</span>
								))}
							</span>
						}
					/>
				</Slide>
				<Slide name="Pódio" shown={shown}>
					<Devices
						screen={
							<>
								<Wordmark className="text-sm" />
								<span className="flex items-end gap-1">
									{[
										{ place: 2, name: "Bruno", height: "h-10" },
										{ place: 1, name: "Ana", height: "h-14" },
										{ place: 3, name: "Carla", height: "h-7" },
									].map((block) => (
										<span
											key={block.place}
											className="flex w-12 flex-col items-center gap-0.5"
										>
											<span className="rounded-sm bg-white px-1 font-bold text-[8px] text-black">
												{block.name}
											</span>
											<span
												className={cn(
													"flex w-full items-start justify-center rounded-t-sm bg-game-accent pt-0.5 font-black text-game-accent-fg text-xs",
													block.height,
												)}
											>
												{block.place}
											</span>
										</span>
									))}
								</span>
							</>
						}
						phone={
							<span className="flex size-7 items-center justify-center rounded-full bg-game-accent font-black text-game-accent-fg text-sm">
								1
							</span>
						}
					/>
				</Slide>
				<div className="flex gap-1">
					{SLIDES.map((slide) => (
						<button
							key={slide.name}
							type="button"
							aria-label={slide.dot}
							aria-pressed={shown === slide.name}
							onClick={() => setShown(slide.name)}
							className="flex size-5 items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
						>
							<span
								className={cn(
									"size-2 rounded-full bg-muted-foreground/40",
									shown === slide.name && "bg-foreground",
								)}
							/>
						</button>
					))}
				</div>
			</div>
		</GameThemeProvider>
	);
}

function Slide({
	name,
	shown,
	children,
}: {
	name: PreviewSlide;
	shown: PreviewSlide;
	children: ReactNode;
}) {
	return (
		<fieldset
			aria-label={`Prévia: ${name}`}
			hidden={shown !== name}
			className="w-full min-w-0"
		>
			{children}
		</fieldset>
	);
}

/**
 * The host's screen, framed as a laptop, and the phone over its right edge.
 * The phone never shows the logo, as in a game (RN-26).
 */
function Devices({ screen, phone }: { screen: ReactNode; phone: ReactNode }) {
	const theme = useGameTheme();
	const phoneLook = theme.custom ? { ...theme.custom, logoUrl: null } : null;
	return (
		<div className="relative mx-auto w-full max-w-lg pr-[14%]">
			<div className="overflow-hidden rounded-lg border-[3px] border-neutral-800 bg-neutral-800 shadow-md">
				<GameScreen className="relative flex aspect-video min-h-0 flex-col items-center justify-center gap-1.5 overflow-hidden p-2">
					{screen}
				</GameScreen>
			</div>
			<GameThemeProvider themeId={theme.themeId} custom={phoneLook}>
				<div className="absolute top-[8%] right-0 w-[24%] overflow-hidden rounded-lg border-[3px] border-neutral-800 bg-neutral-800 shadow-md">
					<GameScreen className="flex aspect-[9/16] min-h-0 flex-col items-center justify-center gap-1.5 overflow-hidden p-1">
						{phone}
					</GameScreen>
				</div>
			</GameThemeProvider>
		</div>
	);
}
