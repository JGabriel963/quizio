import { Button } from "@quizio/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@quizio/ui/components/dropdown-menu";
import { Skeleton } from "@quizio/ui/components/skeleton";
import { cn } from "@quizio/ui/lib/utils";
import { CheckCheckIcon, EllipsisVerticalIcon, UsersIcon } from "lucide-react";
import { useEffect, useRef } from "react";

import { UserAvatar } from "@/components/account/user-avatar";
import type { NotificationData } from "@/lib/api-types";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { notificationText } from "@/lib/notification-labels";

/**
 * The bell's panel (spec 040, RN-12 to RN-17): "Novo" (unread) above
 * "Anteriores", 20 at a time, and "Marcar todas como lidas" in its ⋮. The
 * bell wires the queries and the navigation.
 */
export function NotificationPanel({
	status,
	items,
	hasMore,
	onOpen,
	onReadAll,
	onLoadMore,
	onRetry,
}: {
	status: "loading" | "error" | "ready";
	items: readonly NotificationData[];
	hasMore: boolean;
	onOpen: (notification: NotificationData) => void;
	onReadAll: () => void;
	onLoadMore: () => void;
	onRetry: () => void;
}) {
	const unread = items.filter((item) => !item.read);
	const read = items.filter((item) => item.read);

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2">
				<h2 className="font-bold text-lg">Notificações</h2>
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button
								variant="ghost"
								size="icon"
								aria-label="Opções das notificações"
							/>
						}
					>
						<EllipsisVerticalIcon />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem
							disabled={unread.length === 0}
							onClick={onReadAll}
						>
							<CheckCheckIcon />
							Marcar todas como lidas
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto pb-2">
				{status === "loading" && (
					<div
						role="status"
						aria-busy="true"
						aria-label="Carregando notificações"
						className="flex flex-col gap-3 px-4 py-2"
					>
						{[0, 1, 2].map((row) => (
							<div key={row} className="flex items-center gap-3">
								<Skeleton className="size-12 shrink-0 rounded-full" />
								<Skeleton className="h-10 flex-1" />
							</div>
						))}
					</div>
				)}

				{status === "error" && (
					<div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
						<p className="text-sm">
							Não foi possível carregar as notificações.
						</p>
						<Button variant="outline" size="sm" onClick={onRetry}>
							Tentar de novo
						</Button>
					</div>
				)}

				{status === "ready" && items.length === 0 && (
					<div className="flex flex-col items-center gap-1 px-4 py-10 text-center">
						<p className="font-semibold">Você não tem notificações.</p>
						<p className="text-muted-foreground text-sm">
							As novidades dos seus grupos aparecem aqui.
						</p>
					</div>
				)}

				{status === "ready" && items.length > 0 && (
					<>
						<Section title="Novo" items={unread} onOpen={onOpen} />
						<Section title="Anteriores" items={read} onOpen={onOpen} />
						{hasMore && <LoadMore onLoadMore={onLoadMore} />}
					</>
				)}
			</div>
		</div>
	);
}

function Section({
	title,
	items,
	onOpen,
}: {
	title: string;
	items: readonly NotificationData[];
	onOpen: (notification: NotificationData) => void;
}) {
	// An empty section does not show (RN-13).
	if (items.length === 0) {
		return null;
	}
	const titleId = `notifications-${title}`;
	return (
		<section aria-labelledby={titleId}>
			<h3 id={titleId} className="px-4 pt-2 pb-1 font-bold text-sm">
				{title}
			</h3>
			<ul aria-label={title} className="flex flex-col">
				{items.map((item) => (
					<li key={item.id}>
						<NotificationItem notification={item} onOpen={onOpen} />
					</li>
				))}
			</ul>
		</section>
	);
}

function NotificationItem({
	notification,
	onOpen,
}: {
	notification: NotificationData;
	onOpen: (notification: NotificationData) => void;
}) {
	const text = notificationText(notification);
	const now = new Date();
	const when = formatRelativeTime(
		new Date(now.getTime() - notification.ageMs),
		now,
	);
	return (
		<button
			type="button"
			data-read={notification.read}
			onClick={() => onOpen(notification)}
			className={cn(
				"flex w-full items-start gap-3 border-border border-b px-4 py-3 text-left text-sm outline-none transition-colors hover:bg-muted focus-visible:bg-muted",
				!notification.read && "bg-primary/10 hover:bg-primary/15",
			)}
		>
			<span className="relative shrink-0">
				{notification.actor ? (
					<UserAvatar
						userId={notification.actor.userId}
						photoUrl={notification.actor.photoUrl}
						size="xl"
						className="size-12"
					/>
				) : (
					<span
						data-slot="group-icon"
						className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground"
					>
						<UsersIcon aria-hidden="true" className="size-6" />
					</span>
				)}
				{notification.actor && (
					<span
						data-slot="group-mark"
						aria-hidden="true"
						className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-card text-foreground shadow-sm ring-1 ring-border"
					>
						<UsersIcon className="size-3" />
					</span>
				)}
			</span>
			<span className="flex min-w-0 flex-col gap-1">
				<span>
					{text.actor && <strong className="font-bold">{text.actor}</strong>}
					{text.actor && " "}
					{text.before}
					<strong className="font-bold">{text.group}</strong>
					{text.after}
				</span>
				<span className="flex items-center gap-1.5 text-xs">
					{!notification.read && (
						<span
							data-slot="unread-dot"
							aria-hidden="true"
							className="size-2 rounded-full bg-primary"
						/>
					)}
					<span
						className={cn(
							notification.read ? "text-muted-foreground" : "text-primary",
							"font-semibold",
						)}
					>
						{when}
					</span>
				</span>
			</span>
		</button>
	);
}

/** Scrolling to the end asks for 20 more; the button is there too (RN-13). */
function LoadMore({ onLoadMore }: { onLoadMore: () => void }) {
	const sentinel = useRef<HTMLDivElement>(null);
	const loadMore = useRef(onLoadMore);
	loadMore.current = onLoadMore;

	useEffect(() => {
		const target = sentinel.current;
		if (!target || typeof IntersectionObserver === "undefined") {
			return;
		}
		const observer = new IntersectionObserver((entries) => {
			if (entries.some((entry) => entry.isIntersecting)) {
				loadMore.current();
			}
		});
		observer.observe(target);
		return () => observer.disconnect();
	}, []);

	return (
		<div ref={sentinel} className="flex justify-center px-4 py-2">
			<Button variant="ghost" size="sm" onClick={onLoadMore}>
				Mostrar mais
			</Button>
		</div>
	);
}
