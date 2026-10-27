import type { SharedQuizSort } from "@quizio/core/groups/domain/shared-quiz";
import { Button } from "@quizio/ui/components/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@quizio/ui/components/select";
import { Skeleton } from "@quizio/ui/components/skeleton";
import { LayoutGridIcon, LibraryIcon, ListIcon } from "lucide-react";
import { useId, useState } from "react";

import { ViewOption } from "@/components/groups/group-assignments-tab";
import { UserAvatar } from "@/components/groups/user-avatar";
import { QuizCover } from "@/components/quiz/quiz-cover";
import { VISIBILITY_LABELS } from "@/components/quiz/visibility-badge";
import type { SharedQuizCardData } from "@/lib/api-types";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { gamesLabel } from "@/lib/group-post-labels";
import { questionCountLabel } from "@/lib/quiz-labels";

import { SharedQuizLink } from "./shared-quiz-attachment";
import { type SharedQuizActions, SharedQuizMenu } from "./shared-quiz-menu";

const SORT_LABELS: Record<SharedQuizSort, string> = {
	recent: "Mais recentes",
	oldest: "Mais antigos",
	nameAsc: "Nome (a-z)",
	nameDesc: "Nome (z-a)",
};
const SORT_ITEMS = Object.entries(SORT_LABELS).map(([value, label]) => ({
	value,
	label,
}));

type SharedView = "cards" | "list";
const VIEW_KEY = "quizio:groups:shared-view";

/** Cards or list, kept in this browser (RN-14); storage may be unavailable. */
function rememberedView(): SharedView {
	try {
		return window.localStorage.getItem(VIEW_KEY) === "list" ? "list" : "cards";
	} catch {
		return "cards";
	}
}

function rememberView(view: SharedView): void {
	try {
		window.localStorage.setItem(VIEW_KEY, view);
	} catch {
		// The cards show again next time.
	}
}

/**
 * The Compartilhado tab (spec 037, RN-14, RN-15): "Kahoots", the Compart. for
 * who may share, cards or a list, "Ordenar por" and "Mostrar mais". A card or
 * a row opens the quiz's page.
 */
export function SharedQuizzesTab({
	items,
	loading = false,
	hasMore = false,
	loadingMore = false,
	sort,
	canShare,
	actions,
	onSortChange,
	onShare,
	onLoadMore,
}: {
	/** Undefined while the first page loads. */
	items: readonly SharedQuizCardData[] | undefined;
	loading?: boolean;
	hasMore?: boolean;
	loadingMore?: boolean;
	sort: SharedQuizSort;
	canShare: boolean;
	actions: SharedQuizActions;
	onSortChange: (sort: SharedQuizSort) => void;
	onShare: () => void;
	onLoadMore: () => void;
}) {
	const [view, setView] = useState<SharedView>(rememberedView);
	const headingId = useId();
	const sortLabelId = useId();

	function choose(next: SharedView) {
		setView(next);
		rememberView(next);
	}

	return (
		<section aria-labelledby={headingId} className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-end gap-2">
				{canShare && <Button onClick={onShare}>Compart.</Button>}
				<div className="flex rounded-md border border-border bg-card p-0.5">
					<ViewOption
						label="Cartões"
						icon={<LayoutGridIcon />}
						checked={view === "cards"}
						onCheck={() => choose("cards")}
					/>
					<ViewOption
						label="Lista"
						icon={<ListIcon />}
						checked={view === "list"}
						onCheck={() => choose("list")}
					/>
				</div>
			</div>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2 id={headingId} className="font-bold text-xl">
					Kahoots
				</h2>
				<div className="flex items-center gap-2">
					<span id={sortLabelId} className="text-muted-foreground text-sm">
						Ordenar por:
					</span>
					<Select
						items={SORT_ITEMS}
						value={sort}
						onValueChange={(value) => onSortChange(value as SharedQuizSort)}
					>
						<SelectTrigger aria-labelledby={sortLabelId} className="w-44">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{SORT_ITEMS.map((item) => (
								<SelectItem key={item.value} value={item.value}>
									{item.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			{items === undefined || loading ? (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{["a", "b", "c"].map((key) => (
						<Skeleton key={key} className="h-56 w-full rounded-lg" />
					))}
				</div>
			) : items.length === 0 ? (
				<div className="flex flex-col items-center gap-4 rounded-lg border-2 border-border border-dashed px-6 py-16 text-center">
					<LibraryIcon
						aria-hidden="true"
						className="size-10 text-muted-foreground"
					/>
					<p className="max-w-md text-sm">
						Ainda não há kahoots compartilhados neste grupo.
					</p>
					{canShare && <Button onClick={onShare}>Compart.</Button>}
				</div>
			) : view === "cards" ? (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{items.map((item) => (
						<SharedQuizCard
							key={item.sharedQuizId}
							item={item}
							actions={actions}
						/>
					))}
				</div>
			) : (
				<SharedQuizzesTable items={items} actions={actions} />
			)}

			{hasMore && (
				<Button
					variant="secondary"
					className="self-center"
					disabled={loadingMore}
					aria-busy={loadingMore || undefined}
					onClick={onLoadMore}
				>
					Mostrar mais
				</Button>
			)}
		</section>
	);
}

/** A card: Quiz, the cover with its count, the title and the owner (RN-15). */
function SharedQuizCard({
	item,
	actions,
}: {
	item: SharedQuizCardData;
	actions: SharedQuizActions;
}) {
	return (
		<article className="relative flex flex-col overflow-hidden rounded-lg bg-card shadow-sm">
			<p className="px-3 py-2 font-bold text-sm">Quiz</p>
			<div className="relative aspect-video">
				<QuizCover url={item.coverUrl} className="h-full w-full rounded-none" />
				<span className="absolute right-2 bottom-2 rounded bg-black/70 px-1.5 py-0.5 font-bold text-white text-xs">
					{questionCountLabel(item.questionCount)}
				</span>
			</div>
			<div className="flex items-start gap-2 p-3">
				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<SharedQuizLink
						groupId={actions.groupId}
						quiz={item}
						className="truncate font-bold after:absolute after:inset-0 after:content-['']"
					>
						{item.title}
					</SharedQuizLink>
					<span className="truncate text-muted-foreground text-sm">
						{item.owner.name}
					</span>
				</div>
				<div className="relative z-10">
					<SharedQuizMenu quiz={item} actions={actions} />
				</div>
			</div>
		</article>
	);
}

/** The list: Título, Criado por, Visibilidade and Compartilhados (RN-15). */
function SharedQuizzesTable({
	items,
	actions,
}: {
	items: readonly SharedQuizCardData[];
	actions: SharedQuizActions;
}) {
	return (
		<div className="overflow-hidden rounded-lg bg-card shadow-sm">
			<table aria-label="Kahoots compartilhados" className="w-full text-sm">
				<thead className="border-border border-b text-left">
					<tr>
						<th className="px-4 py-3 font-bold">Título</th>
						<th className="hidden px-4 py-3 font-bold sm:table-cell">
							Criado por
						</th>
						<th className="hidden px-4 py-3 font-bold sm:table-cell">
							Visibilidade
						</th>
						<th className="hidden px-4 py-3 font-bold md:table-cell">
							Compartilhados
						</th>
						<td />
					</tr>
				</thead>
				<tbody>
					{items.map((item) => (
						<tr
							key={item.sharedQuizId}
							className="relative border-border border-b last:border-b-0 hover:bg-muted/50"
						>
							<td className="px-4 py-2">
								<span className="flex items-center gap-3">
									<span className="relative shrink-0">
										<QuizCover
											url={item.coverUrl}
											className="h-12 w-20 rounded"
										/>
										<span className="absolute right-0.5 bottom-0.5 rounded bg-black/70 px-1 font-bold text-[10px] text-white">
											{questionCountLabel(item.questionCount)}
										</span>
									</span>
									<span className="flex min-w-0 flex-col">
										<SharedQuizLink
											groupId={actions.groupId}
											quiz={item}
											className="truncate font-bold after:absolute after:inset-0 after:content-['']"
										>
											{item.title}
										</SharedQuizLink>
										<span className="text-muted-foreground text-xs">
											{gamesLabel(item.games)}
										</span>
									</span>
								</span>
							</td>
							<td className="hidden px-4 py-2 sm:table-cell">
								<span
									role="img"
									aria-label={item.owner.name}
									title={item.owner.name}
									className="inline-flex"
								>
									<UserAvatar userId={item.owner.userId} size="sm" />
								</span>
							</td>
							<td className="hidden px-4 py-2 sm:table-cell">
								{VISIBILITY_LABELS[item.visibility]}
							</td>
							<td className="hidden px-4 py-2 text-muted-foreground md:table-cell">
								{formatRelativeTime(new Date(item.sharedAt))}
							</td>
							<td className="relative z-10 px-2 py-2 text-right">
								<SharedQuizMenu quiz={item} actions={actions} />
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
