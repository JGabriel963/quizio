import { Button } from "@quizio/ui/components/button";
import { Link, useNavigate } from "@tanstack/react-router";
import { MenuIcon, PlusIcon } from "lucide-react";
import { useCreateQuiz } from "@/components/layout/create-quiz-context";
import { GlobalSearch } from "@/components/layout/global-search";
import UserMenu from "@/components/user-menu";

/**
 * Brand, search, create and account. Navigation lives in the sidebar only
 * (spec 002, RN-04 e RN-09).
 */
export function TopBar({
	navOpen,
	onToggleNav,
	navId,
}: {
	navOpen: boolean;
	onToggleNav: () => void;
	navId: string;
}) {
	const navigate = useNavigate();
	const { createQuiz, creating } = useCreateQuiz();

	return (
		<header className="border-border border-b bg-card">
			{/* Narrow screens give the search its own row: squeezed between the
			    brand and Criar it would be unusable. */}
			<div className="flex flex-wrap items-center gap-2 px-3 py-2 sm:h-16 sm:flex-nowrap sm:gap-3 sm:px-4 sm:py-0">
				<Button
					variant="ghost"
					size="icon"
					aria-label="Navegação"
					aria-expanded={navOpen}
					aria-controls={navId}
					onClick={onToggleNav}
					className="shrink-0 md:hidden"
				>
					<MenuIcon />
				</Button>

				<Link
					to="/"
					className="shrink-0 font-black text-brand text-xl tracking-tight"
				>
					Quizio
				</Link>

				<div className="order-last flex w-full min-w-0 justify-center sm:order-none sm:w-auto sm:flex-1">
					<GlobalSearch
						onSearch={(q) =>
							navigate({ to: "/library", search: { section: "recent", q } })
						}
					/>
				</div>

				<div className="ml-auto flex shrink-0 items-center gap-2 sm:ml-0">
					<Button onClick={createQuiz} disabled={creating}>
						<PlusIcon data-icon="inline-start" />
						Criar
					</Button>
					<UserMenu />
				</div>
			</div>
		</header>
	);
}
