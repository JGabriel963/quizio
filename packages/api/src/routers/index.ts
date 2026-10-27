import { publicProcedure, router } from "../index";
import { authRouter } from "./auth";
import { gameRouter } from "./game";
import { groupRouter } from "./group";
import { libraryRouter } from "./library";
import { mediaRouter } from "./media";
import { quizRouter } from "./quiz";
import { reportRouter } from "./report";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
	}),
	auth: authRouter,
	game: gameRouter,
	group: groupRouter,
	library: libraryRouter,
	media: mediaRouter,
	quiz: quizRouter,
	report: reportRouter,
});
export type AppRouter = typeof appRouter;
