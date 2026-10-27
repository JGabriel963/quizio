import { Button } from "@quizio/ui/components/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@quizio/ui/components/popover";
import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { BellIcon } from "lucide-react";
import { type ComponentProps, type ReactNode, useState } from "react";

import { notificationDestination } from "@/lib/notification-labels";
import { useRealtimeEvent } from "@/lib/realtime";
import { useTRPC } from "@/utils/trpc";

import { NotificationPanel } from "./notification-panel";

/** The bell right of the photo, with the red dot (spec 040, RN-09, RN-10). */
export function NotificationBellView({
	hasNews,
	open,
	onOpenChange,
	children,
}: {
	hasNews: boolean;
	open: boolean;
	onOpenChange: ComponentProps<typeof Popover>["onOpenChange"];
	children: ReactNode;
}) {
	return (
		<Popover open={open} onOpenChange={onOpenChange}>
			<PopoverTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						aria-label={hasNews ? "Notificações, há novidades" : "Notificações"}
						className="relative shrink-0 rounded-full"
					/>
				}
			>
				<BellIcon />
				{hasNews && (
					<span
						data-slot="news-dot"
						aria-hidden="true"
						className="absolute top-1 right-1 size-2.5 rounded-full bg-destructive ring-2 ring-card"
					/>
				)}
			</PopoverTrigger>
			{/* On a narrow screen the panel takes the width it has (RN-12). */}
			<PopoverContent
				aria-label="Notificações"
				className="max-h-[min(36rem,var(--available-height))] w-(--available-width) sm:w-96 sm:max-w-(--available-width)"
			>
				{children}
			</PopoverContent>
		</Popover>
	);
}

/**
 * The bell with its data (spec 040): the summary every 60 s, on focus and on
 * the inbox's realtime hint (RN-11); opening marks the panel seen (RN-10);
 * a notification read and followed (RN-17).
 */
export function NotificationBell() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const [open, setOpen] = useState(false);
	const summary = useQuery({
		...trpc.notification.summary.queryOptions(),
		refetchInterval: 60_000,
		refetchOnWindowFocus: true,
		meta: { suppressErrorToast: true },
	});
	// Pages of 20 from a cursor, as far back as the inbox goes (RN-13).
	const list = useInfiniteQuery({
		...trpc.notification.list.infiniteQueryOptions(
			{},
			{ getNextPageParam: (page) => page.nextCursor ?? undefined },
		),
		enabled: open,
		meta: { suppressErrorToast: true },
	});
	const pages = list.data?.pages ?? [];
	const items = pages.flatMap((page) => page.items);
	const refresh = () =>
		queryClient.invalidateQueries({ queryKey: trpc.notification.pathKey() });
	useRealtimeEvent(summary.data?.channel ?? null, "inbox-changed", () => {
		void refresh();
	});
	const seen = useMutation(
		trpc.notification.seen.mutationOptions({ onSuccess: refresh }),
	);
	const read = useMutation(
		trpc.notification.read.mutationOptions({ onSuccess: refresh }),
	);
	const readAll = useMutation(
		trpc.notification.readAll.mutationOptions({ onSuccess: refresh }),
	);

	return (
		<NotificationBellView
			hasNews={summary.data?.hasNews ?? false}
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (next) {
					seen.mutate();
				}
			}}
		>
			<NotificationPanel
				// A page that fails to load keeps the ones already shown.
				status={list.data ? "ready" : list.isError ? "error" : "loading"}
				items={items}
				hasMore={list.hasNextPage}
				hasUnread={pages[0]?.hasUnread ?? false}
				onRetry={() => list.refetch()}
				onReadAll={() => readAll.mutate()}
				onLoadMore={() => {
					if (!list.isFetchingNextPage) {
						void list.fetchNextPage();
					}
				}}
				onOpen={(notification) => {
					if (!notification.read) {
						read.mutate({ id: notification.id });
					}
					const destination = notificationDestination(notification);
					if (!destination) {
						return;
					}
					setOpen(false);
					if (destination.to === "post") {
						void navigate({
							to: "/groups/$groupId/posts/$postId",
							params: {
								groupId: destination.groupId,
								postId: destination.postId,
							},
						});
					} else {
						void navigate({
							to: "/groups/$groupId/members",
							params: { groupId: destination.groupId },
						});
					}
				}}
			/>
		</NotificationBellView>
	);
}
