import { normalizeSearchText } from "@quizio/core/shared/domain/search-text";
import { Button } from "@quizio/ui/components/button";
import { Input } from "@quizio/ui/components/input";
import { TabNav, TabNavItem } from "@quizio/ui/components/tab-nav";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import type { ReportQuestionData } from "@/lib/api-types";
import { questionTypeLabel } from "@/lib/quiz-labels";

import { AccuracyRing } from "./accuracy-ring";
import { REPORT_TABLE_PAGE, type ReportView } from "./report-parts";

const ROW_GRID =
	"grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3 md:grid-cols-[2rem_minmax(0,1fr)_11rem_9rem]";

/**
 * The questions of a game in the order they were played: all of them, or the
 * difficult ones (spec 015, RN-43). A question opens how the group answered.
 */
export function QuestionsTable({
	gameId,
	questions,
	view,
}: {
	gameId: string;
	questions: ReportQuestionData[];
	view: ReportView;
}) {
	const [search, setSearch] = useState("");
	const [showAll, setShowAll] = useState(false);
	const difficult = questions.filter((question) => question.difficult);
	const inView = view === "flagged" ? difficult : questions;
	const searchText = normalizeSearchText(search);
	const rows =
		searchText === ""
			? inView
			: inView.filter((question) =>
					normalizeSearchText(question.text).includes(searchText),
				);
	const shown = showAll ? rows : rows.slice(0, REPORT_TABLE_PAGE);

	return (
		<section className="flex flex-col rounded-lg bg-card shadow-sm ring-1 ring-foreground/5">
			<div className="flex flex-col gap-2 border-border border-b p-2 sm:flex-row sm:items-center sm:justify-between">
				<TabNav aria-label="Perguntas a listar">
					{(
						[
							["all", `Todos (${questions.length})`],
							["flagged", `Perguntas difíceis (${difficult.length})`],
						] as const
					).map(([target, label]) => (
						<TabNavItem
							key={target}
							current={target === view}
							render={
								<Link
									to="/reports/$gameId"
									params={{ gameId }}
									search={{ tab: "questions", view: target }}
								/>
							}
						>
							{label}
						</TabNavItem>
					))}
				</TabNav>
				<Input
					type="search"
					aria-label="Pesquisar perguntas"
					placeholder="Pesquisar"
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					className="sm:max-w-56"
				/>
			</div>

			<div
				aria-hidden="true"
				className={`${ROW_GRID} hidden bg-muted/60 font-bold text-sm md:grid`}
			>
				<span className="col-span-2">Pergunta</span>
				<span>Tipo</span>
				<span>Respostas corretas</span>
			</div>

			{rows.length === 0 ? (
				<p className="px-4 py-10 text-center text-muted-foreground">
					{searchText !== ""
						? `Nada encontrado para “${search.trim()}”.`
						: view === "flagged"
							? "Nenhuma pergunta foi difícil para o grupo"
							: "Nenhuma pergunta chegou ao resultado"}
				</p>
			) : (
				<ul aria-label="Perguntas" className="divide-y divide-border">
					{shown.map((question) => (
						<li key={question.index} className={ROW_GRID}>
							<span className="font-bold tabular-nums">
								{question.index + 1}
							</span>
							<Link
								to="/reports/$gameId"
								params={{ gameId }}
								search={{ tab: "questions", view, question: question.index }}
								className="min-w-0 break-words font-semibold hover:underline"
							>
								{question.text}
							</Link>
							<span className="col-start-2 text-muted-foreground text-sm md:col-start-auto md:text-foreground">
								{questionTypeLabel(question.type)}
							</span>
							<span className="col-start-3 row-start-1 inline-flex items-center md:col-start-auto md:row-start-auto">
								<span className="sr-only">Respostas corretas:</span>
								<AccuracyRing percent={question.accuracyPercent} />
							</span>
						</li>
					))}
				</ul>
			)}

			{shown.length < rows.length && (
				<Button
					variant="link"
					className="self-center py-4"
					onClick={() => setShowAll(true)}
				>
					Mostrar mais
				</Button>
			)}
		</section>
	);
}
