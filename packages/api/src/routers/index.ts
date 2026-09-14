import { publicProcedure, router } from "../index";
import { authRouter } from "./auth";
import { libraryRouter } from "./library";
import { mediaRouter } from "./media";
import { quizRouter } from "./quiz";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
	}),
	auth: authRouter,
	library: libraryRouter,
	media: mediaRouter,
	quiz: quizRouter,
});
export type AppRouter = typeof appRouter;
