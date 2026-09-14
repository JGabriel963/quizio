import { publicProcedure, router } from "../index";

export const authRouter = router({
	/** Lets the login screen show the Google button and the sign-up closed notice. */
	settings: publicProcedure.query(({ ctx }) => ({
		signUpEnabled: ctx.container.authSettings.signUpEnabled,
		googleEnabled: ctx.container.authSettings.googleEnabled,
	})),
});
