import { buttonVariants } from "@quizio/ui/components/button";
import { Link } from "@tanstack/react-router";

import { GameScreen, Wordmark } from "../game-screen";

/**
 * The host's screen after the last question (spec 009, RN-30). Provisional:
 * the podium replaces it (spec 011).
 */
export function GameFinished({
	title,
	quizId,
}: {
	title: string;
	quizId: string;
}) {
	return (
		<GameScreen className="flex flex-col items-center justify-center gap-6 p-6 text-center">
			<Wordmark className="text-5xl" />
			<h1 className="font-black text-5xl sm:text-7xl">Fim do jogo</h1>
			<p className="break-words font-bold text-2xl sm:text-3xl">{title}</p>
			<Link
				to="/quizzes/$quizId"
				params={{ quizId }}
				className={buttonVariants({ variant: "secondary", size: "lg" })}
			>
				Voltar ao quiz
			</Link>
		</GameScreen>
	);
}
