import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { PublicHeader } from "@/components/layout/public-header";
import { LEGAL_UPDATED_AT } from "@/lib/legal";

export type LegalSection = {
	id: string;
	title: string;
	content: ReactNode;
};

/**
 * The Terms of Use and the Privacy Policy: a title, the date of the last
 * change, a list of the sections that jumps to each one, and the sections.
 */
export function LegalPage({
	title,
	intro,
	sections,
	other,
}: {
	title: string;
	intro: ReactNode;
	sections: LegalSection[];
	/** The other document, linked at the top and at the end. */
	other: { to: "/terms" | "/privacy"; label: string };
}) {
	return (
		<div className="flex min-h-svh flex-col bg-background">
			<PublicHeader />
			<main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14">
				<article className="flex flex-col gap-8">
					<header className="flex flex-col gap-3">
						<h1 className="font-black text-3xl tracking-tight sm:text-4xl">
							{title}
						</h1>
						<p className="text-muted-foreground text-sm">
							Última atualização: {LEGAL_UPDATED_AT}
						</p>
						<div className="flex flex-col gap-3 text-pretty leading-relaxed">
							{intro}
						</div>
					</header>
					<nav
						aria-label="Seções"
						className="rounded-xl bg-card p-5 shadow-press-light"
					>
						<h2 className="mb-3 font-bold">Nesta página</h2>
						<ol className="grid list-decimal gap-1.5 pl-5 text-sm sm:grid-cols-2">
							{sections.map((section) => (
								<li key={section.id}>
									<a
										href={`#${section.id}`}
										className="text-primary underline-offset-4 hover:underline"
									>
										{section.title}
									</a>
								</li>
							))}
						</ol>
					</nav>
					{sections.map((section, index) => (
						<section
							key={section.id}
							id={section.id}
							aria-labelledby={`${section.id}-title`}
							className="flex scroll-mt-20 flex-col gap-3 text-pretty leading-relaxed [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_li]:pl-1 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1.5 [&_ul]:pl-5"
						>
							<h2 id={`${section.id}-title`} className="font-bold text-xl">
								{index + 1}. {section.title}
							</h2>
							{section.content}
						</section>
					))}
					<p className="border-border border-t pt-6 text-muted-foreground text-sm">
						Veja também:{" "}
						<Link
							to={other.to}
							className="font-semibold text-primary underline underline-offset-4"
						>
							{other.label}
						</Link>
						.
					</p>
				</article>
			</main>
		</div>
	);
}
