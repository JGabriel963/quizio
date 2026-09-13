import { protectedProcedure, publicProcedure, router } from "../index";
import { mediaRouter } from "./media";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
	}),
	privateData: protectedProcedure.query(({ ctx }) => {
		return {
			message: "This is private",
			user: ctx.session.user,
		};
	}),
	media: mediaRouter,
});
export type AppRouter = typeof appRouter;
