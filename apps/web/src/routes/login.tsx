import { useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	redirect,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { z } from "zod";

import { SignInForm } from "@/components/auth/sign-in-form";
import { SignUpForm } from "@/components/auth/sign-up-form";
import Loader from "@/components/loader";
import { getUser } from "@/functions/get-user";
import { authClient } from "@/lib/auth-client";
import { safeRedirect } from "@/lib/safe-redirect";
import { useTRPC } from "@/utils/trpc";

const loginSearchSchema = z.object({
	mode: z.enum(["sign-in", "sign-up"]).optional(),
	/** Page to return to after signing in (spec 001, RN-09). */
	redirect: z.string().optional(),
	/** Error code appended by a failed Google redirect. */
	error: z.string().optional(),
});

export const Route = createFileRoute("/login")({
	validateSearch: loginSearchSchema,
	beforeLoad: async ({ search }) => {
		if (await getUser()) {
			throw redirect({ href: safeRedirect(search.redirect) });
		}
	},
	component: LoginPage,
});

function LoginPage() {
	const { mode = "sign-in", redirect: redirectTo, error } = Route.useSearch();
	const navigate = useNavigate();
	const router = useRouter();
	const trpc = useTRPC();
	const settings = useQuery(trpc.auth.settings.queryOptions());
	const destination = safeRedirect(redirectTo);

	const switchMode = (next: "sign-in" | "sign-up") =>
		navigate({ to: "/login", search: { mode: next, redirect: redirectTo } });

	const enterApp = async () => {
		await router.invalidate();
		await navigate({ href: destination });
	};

	const signInWithGoogle = () => {
		const errorSearch = new URLSearchParams({ mode });
		if (redirectTo) {
			errorSearch.set("redirect", redirectTo);
		}
		authClient.signIn.social({
			provider: "google",
			callbackURL: destination,
			errorCallbackURL: `/login?${errorSearch.toString()}`,
		});
	};

	if (settings.isPending) {
		return <Loader />;
	}

	const { signUpEnabled = true, googleEnabled = false } = settings.data ?? {};

	return (
		<main className="mx-auto flex w-full max-w-md flex-col px-4 py-10">
			<div className="rounded-lg bg-card p-6 shadow-sm sm:p-8">
				{mode === "sign-up" ? (
					<SignUpForm
						signUpEnabled={signUpEnabled}
						googleEnabled={googleEnabled}
						onSignUp={async (values) => {
							const { error: signUpError } =
								await authClient.signUp.email(values);
							if (!signUpError) {
								await enterApp();
							}
							return { error: signUpError };
						}}
						onGoogleSignIn={signInWithGoogle}
						onSwitchToSignIn={() => switchMode("sign-in")}
					/>
				) : (
					<SignInForm
						googleEnabled={googleEnabled}
						initialError={error ? { code: error } : null}
						onSignIn={async (values) => {
							const { error: signInError } =
								await authClient.signIn.email(values);
							if (!signInError) {
								await enterApp();
							}
							return { error: signInError };
						}}
						onGoogleSignIn={signInWithGoogle}
						onSwitchToSignUp={() => switchMode("sign-up")}
					/>
				)}
			</div>
		</main>
	);
}
