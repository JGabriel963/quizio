import { Badge } from "@quizio/ui/components/badge";
import { Button } from "@quizio/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@quizio/ui/components/dropdown-menu";
import { Input } from "@quizio/ui/components/input";
import { TabNav, TabNavItem } from "@quizio/ui/components/tab-nav";
import { Link } from "@tanstack/react-router";
import { EllipsisVerticalIcon, PencilIcon } from "lucide-react";
import { useId, useState } from "react";

import type { ReportHeaderData } from "@/lib/api-types";
import { reportDateLabel } from "@/lib/report-labels";
import { RENAME_FAILED_MESSAGE, reportNameProblem } from "@/lib/report-name";

import type { ReportTab } from "./report-parts";

/**
 * The top of an open report: its name, which can be changed in place, when it
 * was played and by whom, its options and its tabs (spec 015, RN-32 to RN-34,
 * RN-45 to RN-47).
 */
export function ReportHeader({
	header,
	hostName,
	tab,
	onRename,
	onMoveToTrash,
}: {
	header: ReportHeaderData;
	/** Whoever is looking: a report is always its creator's (RN-03). */
	hostName: string;
	tab: ReportTab;
	/** Rejects when the server did not take the name. */
	onRename: (name: string) => Promise<unknown>;
	onMoveToTrash: () => void;
}) {
	const tabs: { tab: ReportTab; label: string; count?: number }[] = [
		{ tab: "summary", label: "Resumo" },
		{
			tab: "participants",
			label: "Participantes",
			count: header.participantCount,
		},
		{ tab: "questions", label: "Perguntas", count: header.playedCount },
	];

	return (
		<header className="flex flex-col gap-4">
			<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<div className="flex items-center justify-between gap-3">
						<p className="font-bold text-muted-foreground text-sm">Relatório</p>
						<DropdownMenu>
							<DropdownMenuTrigger
								render={<Button variant="ghost" size="sm" />}
							>
								Opções de relatório
								<EllipsisVerticalIcon data-icon="inline-end" />
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								{header.quizId && (
									<DropdownMenuItem
										render={
											<Link
												to="/quizzes/$quizId"
												params={{ quizId: header.quizId }}
											/>
										}
									>
										Ver quiz
									</DropdownMenuItem>
								)}
								<DropdownMenuItem variant="destructive" onClick={onMoveToTrash}>
									Mover para a lixeira
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
					<ReportName name={header.name} onRename={onRename} />
				</div>

				<dl className="flex shrink-0 flex-col gap-1 text-sm lg:w-64 lg:border-border lg:border-l lg:pl-4">
					<div className="flex flex-wrap items-center gap-2">
						<dt className="sr-only">Modo</dt>
						<dd>Ao vivo</dd>
						{header.endedEarly && (
							<dd>
								<Badge variant="private">Encerrada antes do fim</Badge>
							</dd>
						)}
					</div>
					<div>
						<dt className="sr-only">Iniciada em</dt>
						<dd>{reportDateLabel(header.startedAt)}</dd>
					</div>
					<div>
						<dt className="sr-only">Anfitrião</dt>
						<dd>Organizado por {hostName}</dd>
					</div>
				</dl>
			</div>

			<div>
				<TabNav aria-label="Partes do relatório">
					{tabs.map(({ tab: target, label, count }) => (
						<TabNavItem
							key={target}
							current={target === tab}
							render={
								<Link
									to="/reports/$gameId"
									params={{ gameId: header.gameId }}
									search={{ tab: target }}
								/>
							}
						>
							{label}
							{count !== undefined && (
								<span className="font-normal">({count})</span>
							)}
						</TabNavItem>
					))}
				</TabNav>
			</div>
		</header>
	);
}

/** The name, and the field it turns into when the pencil is pressed. */
function ReportName({
	name,
	onRename,
}: {
	name: string;
	onRename: (name: string) => Promise<unknown>;
}) {
	const errorId = useId();
	const [draft, setDraft] = useState<string | null>(null);
	/** The name just sent, shown until the report is read again. */
	const [sent, setSent] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	async function save(value: string) {
		const problem = reportNameProblem(value);
		if (problem) {
			setError(problem);
			return;
		}
		const next = value.trim();
		setDraft(null);
		setError(null);
		if (next === name) {
			return;
		}
		setSent(next);
		try {
			await onRename(next);
		} catch {
			// The name before stays, and the reason is told (RN-47).
			setError(RENAME_FAILED_MESSAGE);
		} finally {
			setSent(null);
		}
	}

	if (draft !== null) {
		return (
			<form
				className="flex flex-col gap-2"
				noValidate
				onSubmit={(event) => {
					event.preventDefault();
					void save(draft);
				}}
			>
				<div className="flex flex-wrap items-center gap-2">
					<Input
						aria-label="Nome do relatório"
						value={draft}
						autoFocus
						aria-invalid={error !== null || undefined}
						aria-describedby={error ? errorId : undefined}
						className="h-11 min-w-0 flex-1 font-bold text-lg"
						onChange={(event) => {
							setDraft(event.target.value);
							setError(null);
						}}
						onKeyDown={(event) => {
							if (event.key === "Escape") {
								setDraft(null);
								setError(null);
							}
						}}
					/>
					<Button type="submit">Salvar</Button>
					<Button
						type="button"
						variant="outline"
						onClick={() => {
							setDraft(null);
							setError(null);
						}}
					>
						Cancelar
					</Button>
				</div>
				{error && (
					<p id={errorId} role="alert" className="text-destructive text-sm">
						{error}
					</p>
				)}
			</form>
		);
	}

	return (
		<div className="flex flex-col gap-1">
			<div className="flex min-w-0 items-center gap-2">
				<h1 className="min-w-0 break-words font-black text-2xl sm:text-3xl">
					{sent ?? name}
				</h1>
				<Button
					variant="ghost"
					size="icon"
					aria-label="Renomear relatório"
					onClick={() => {
						setDraft(name);
						setError(null);
					}}
				>
					<PencilIcon />
				</Button>
			</div>
			{error && (
				<p role="alert" className="text-destructive text-sm">
					{error}
				</p>
			)}
		</div>
	);
}
