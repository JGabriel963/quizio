import { buttonVariants } from "@quizio/ui/components/button";
import { Link } from "@tanstack/react-router";

import { PublicHeader } from "@/components/layout/public-header";

/** What a visitor sees at `/` (spec 002, RN-01): what Quizio is, and how to get in. */
export function PublicLanding() {
	return (
		<div className="flex min-h-svh flex-col">
			<PublicHeader showSignIn={false} />
			<main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-8 px-4 py-16 text-center">
				<div className="flex flex-col gap-3">
					<h1 className="font-black text-5xl text-brand tracking-tight">
						Quizio
					</h1>
					<p className="text-lg text-muted-foreground">
						Quizzes ao vivo, sem limite de participantes.
					</p>
				</div>
				{/* Real links, not Base UI buttons: these navigate, and the
				    primitive would announce them as buttons. */}
				<div className="flex flex-wrap justify-center gap-3">
					<Link
						to="/login"
						search={{ mode: "sign-in" }}
						className={buttonVariants({ size: "lg" })}
					>
						Entrar
					</Link>
					<Link
						to="/login"
						search={{ mode: "sign-up" }}
						className={buttonVariants({ size: "lg", variant: "brand" })}
					>
						Criar conta
					</Link>
				</div>
			</main>
		</div>
	);
}
