import { useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
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
		<div className="relative isolate flex min-h-svh flex-col overflow-hidden bg-background">
			{/* Kahoot's backdrop: a large circle and a turned square in a faint gray. */}
			<div
				aria-hidden="true"
				className="absolute bottom-[-22rem] -left-48 -z-10 size-[38rem] rounded-full bg-muted/60"
			/>
			<div
				aria-hidden="true"
				className="absolute -top-40 -right-40 -z-10 hidden size-[28rem] rotate-45 bg-muted/60 md:block"
			/>
			<header className="px-4 py-3">
				<Link to="/" className="font-black text-2xl text-brand tracking-tight">
					Quizio
				</Link>
			</header>
			<main className="flex flex-1 flex-col items-center px-4 pt-6 pb-16 sm:pt-[12vh]">
				<div className="w-full max-w-[25.5rem] rounded-md bg-card p-6 shadow-md">
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
		</div>
	);
}
