import type { GroupAssignmentSort } from "@quizio/core/groups/domain/group-assignment";
import { Button } from "@quizio/ui/components/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@quizio/ui/components/select";
import { cn } from "@quizio/ui/lib/utils";
import {
	ClipboardListIcon,
	LayoutGridIcon,
	ListIcon,
	TimerIcon,
} from "lucide-react";
import { useId, useState } from "react";
import { UserAvatar } from "@/components/account/user-avatar";
import { QuizCover } from "@/components/quiz/quiz-cover";
import type { GroupAssignmentData } from "@/lib/api-types";
import { assignmentLink } from "@/lib/assignment-link";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { timeLeftLabel } from "@/lib/group-post-labels";
import { questionCountLabel } from "@/lib/quiz-labels";
import { PostMenu } from "./group-post";

const SORT_LABELS: Record<GroupAssignmentSort, string> = {
	recent: "Mais recentes",
	oldest: "Mais antigas",
	deadline: "Prazo mais próximo",
};
const SORT_ITEMS = Object.entries(SORT_LABELS).map(([value, label]) => ({
	value,
	label,
}));

type AssignmentsView = "cards" | "list";
const VIEW_KEY = "quizio:groups:assignments-view";

/** Cards or list, kept in this browser (RN-22); storage may be unavailable. */
function rememberedView(): AssignmentsView {
	try {
		return window.localStorage.getItem(VIEW_KEY) === "list" ? "list" : "cards";
	} catch {
		return "cards";
	}
}

function rememberView(view: AssignmentsView): void {
	try {
		window.localStorage.setItem(VIEW_KEY, view);
	} catch {
		// The cards show again next time.
	}
}

/**
 * The Atribuições tab (spec 038, RN-22 to RN-24): the group's open
 * assignments as cards or a list, in the order of "Classificar por". A card or
 * a row opens the activity in a new tab, as Iniciar does.
 */
export function GroupAssignmentsTab({
	items,
	sort,
	onSortChange,
	canAssign,
	onAssign,
	origin,
	onDelete,
}: {
	items: readonly GroupAssignmentData[];
	sort: GroupAssignmentSort;
	onSortChange: (sort: GroupAssignmentSort) => void;
	canAssign: boolean;
	onAssign: () => void;
	origin: string;
	onDelete: (postId: string) => Promise<unknown>;
}) {
	const [view, setView] = useState<AssignmentsView>(rememberedView);
	const headingId = useId();
	const sortLabelId = useId();

	function choose(next: AssignmentsView) {
		setView(next);
		rememberView(next);
	}

	return (
		<section aria-labelledby={headingId} className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2 id={headingId} className="font-bold text-xl">
					Kahoots
				</h2>
				<div className="flex flex-wrap items-center gap-2">
					{canAssign && <Button onClick={onAssign}>Atribuir</Button>}
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
					<span id={sortLabelId} className="text-muted-foreground text-sm">
						Classificar por
					</span>
					<Select
						items={SORT_ITEMS}
						value={sort}
						onValueChange={(value) =>
							onSortChange(value as GroupAssignmentSort)
						}
					>
						<SelectTrigger aria-labelledby={sortLabelId} className="w-48">
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

			{items.length === 0 ? (
				<div className="flex flex-col items-center gap-4 rounded-lg border-2 border-border border-dashed px-6 py-16 text-center">
					<ClipboardListIcon
						aria-hidden="true"
						className="size-10 text-muted-foreground"
					/>
					<p className="max-w-md text-sm">
						Nenhuma atividade foi atribuída a este grupo ainda.
					</p>
					{canAssign && <Button onClick={onAssign}>Atribuir</Button>}
				</div>
			) : view === "cards" ? (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{items.map((item) => (
						<AssignmentCard
							key={item.postId}
							item={item}
							origin={origin}
							onDelete={() => onDelete(item.postId)}
						/>
					))}
				</div>
			) : (
				<AssignmentsTable items={items} origin={origin} onDelete={onDelete} />
			)}
		</section>
	);
}

export function ViewOption({
	label,
	icon,
	checked,
	onCheck,
}: {
	label: string;
	icon: React.ReactNode;
	checked: boolean;
	onCheck: () => void;
}) {
	return (
		<button
			type="button"
			aria-pressed={checked}
			aria-label={label}
			title={label}
			onClick={onCheck}
			className={cn(
				"inline-flex size-8 items-center justify-center rounded-sm text-muted-foreground [&>svg]:size-4",
				checked && "bg-primary text-primary-foreground",
			)}
		>
			{icon}
		</button>
	);
}

/** A card: Kahoot, the time left, the cover, the title and who assigned (RN-23). */
function AssignmentCard({
	item,
	origin,
	onDelete,
}: {
	item: GroupAssignmentData;
	origin: string;
	onDelete: () => Promise<unknown>;
}) {
	return (
		<article className="relative flex flex-col overflow-hidden rounded-lg bg-card shadow-sm">
			<div className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
				<span className="font-bold">Kahoot</span>
				<span className="inline-flex items-center gap-1 text-muted-foreground">
					<TimerIcon aria-hidden="true" className="size-4" />
					{timeLeftLabel(item.remainingMs)}
				</span>
			</div>
			<div className="relative aspect-video">
				<QuizCover url={item.coverUrl} className="h-full w-full rounded-none" />
				<span className="absolute right-2 bottom-2 rounded bg-black/70 px-1.5 py-0.5 font-bold text-white text-xs">
					{questionCountLabel(item.questionCount)}
				</span>
			</div>
			<div className="flex items-start gap-2 p-3">
				<div className="flex min-w-0 flex-1 flex-col gap-2">
					<a
						href={assignmentLink(origin, item.gameId)}
						target="_blank"
						rel="noopener noreferrer"
						className="truncate font-bold after:absolute after:inset-0 after:content-['']"
					>
						{item.name}
					</a>
					<span className="flex items-center gap-2 text-muted-foreground text-sm">
						<UserAvatar
							userId={item.assignedBy.userId}
							photoUrl={item.assignedBy.photoUrl}
							size="sm"
						/>
						<span className="truncate">{item.assignedBy.name}</span>
					</span>
				</div>
				<div className="relative z-10">
					<PostMenu
						gameId={item.gameId}
						canSeeReport={item.canSeeReport}
						canDelete={item.canDelete}
						onDelete={onDelete}
					/>
				</div>
			</div>
		</article>
	);
}

/** The list: Título, Atribuído por, Prazo and Atribuído (RN-23). */
function AssignmentsTable({
	items,
	origin,
	onDelete,
}: {
	items: readonly GroupAssignmentData[];
	origin: string;
	onDelete: (postId: string) => Promise<unknown>;
}) {
	return (
		<div className="overflow-hidden rounded-lg bg-card shadow-sm">
			<table aria-label="Atribuições do grupo" className="w-full text-sm">
				<thead className="border-border border-b text-left">
					<tr>
						<th className="px-4 py-3 font-bold">Título</th>
						<th className="px-4 py-3 font-bold">Atribuído por</th>
						<th className="px-4 py-3 font-bold">Prazo</th>
						<th className="hidden px-4 py-3 font-bold sm:table-cell">
							Atribuído
						</th>
						<td />
					</tr>
				</thead>
				<tbody>
					{items.map((item) => (
						<tr
							key={item.postId}
							className="relative border-border border-b last:border-b-0 hover:bg-muted/50"
						>
							<td className="px-4 py-2">
								<span className="flex items-center gap-3">
									<QuizCover
										url={item.coverUrl}
										className="h-10 w-16 shrink-0 rounded"
									/>
									<a
										href={assignmentLink(origin, item.gameId)}
										target="_blank"
										rel="noopener noreferrer"
										className="truncate font-bold after:absolute after:inset-0 after:content-['']"
									>
										{item.name}
									</a>
								</span>
							</td>
							<td className="px-4 py-2">
								<span
									role="img"
									aria-label={item.assignedBy.name}
									title={item.assignedBy.name}
									className="inline-flex"
								>
									<UserAvatar
										userId={item.assignedBy.userId}
										photoUrl={item.assignedBy.photoUrl}
										size="sm"
									/>
								</span>
							</td>
							<td className="px-4 py-2">{timeLeftLabel(item.remainingMs)}</td>
							<td className="hidden px-4 py-2 text-muted-foreground sm:table-cell">
								{formatRelativeTime(new Date(item.assignedAt))}
							</td>
							<td className="relative z-10 px-2 py-2 text-right">
								<PostMenu
									gameId={item.gameId}
									canSeeReport={item.canSeeReport}
									canDelete={item.canDelete}
									onDelete={() => onDelete(item.postId)}
								/>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
