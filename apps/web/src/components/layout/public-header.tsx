import { buttonVariants } from "@quizio/ui/components/button";
import { Link } from "@tanstack/react-router";

/** Header for the screens a visitor sees: brand only, no creator navigation (spec 002, RN-07). */
export function PublicHeader({ showSignIn = true }: { showSignIn?: boolean }) {
	return (
		<header className="border-border border-b bg-card">
			<div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
				<Link to="/" className="font-black text-2xl text-brand tracking-tight">
					Quizio
				</Link>
				{showSignIn ? (
					<Link
						to="/login"
						search={{ mode: "sign-in" }}
						className={buttonVariants({ variant: "outline" })}
					>
						Entrar
					</Link>
				) : null}
			</div>
		</header>
	);
}
