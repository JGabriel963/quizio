import { Link } from "@tanstack/react-router";

import UserMenu from "./user-menu";

export default function Header() {
	return (
		<header className="border-border border-b bg-card">
			<div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4">
				<div className="flex items-center gap-6">
					<Link
						to="/"
						className="font-black text-2xl text-brand tracking-tight"
					>
						Quizio
					</Link>
					<nav className="flex items-center gap-4 font-semibold text-sm">
						<Link
							to="/library"
							search={{ section: "recent" }}
							className="text-muted-foreground hover:text-foreground data-[status=active]:text-brand"
						>
							Biblioteca
						</Link>
					</nav>
				</div>
				<UserMenu />
			</div>
		</header>
	);
}
