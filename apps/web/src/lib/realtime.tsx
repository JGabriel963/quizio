import type {
	RealtimeHandler,
	RealtimeSubscriber,
} from "@quizio/realtime/realtime-subscriber";
import {
	createContext,
	use,
	useCallback,
	useEffect,
	useEffectEvent,
	useRef,
} from "react";

const RealtimeContext = createContext<(() => RealtimeSubscriber) | null>(null);

/**
 * Provides the realtime port to components. The subscriber is created on the
 * first subscription, so pages that never listen never open a socket, and
 * nothing connects during SSR (effects do not run on the server).
 */
export function RealtimeProvider({
	createSubscriber,
	children,
}: {
	createSubscriber: () => RealtimeSubscriber;
	children: React.ReactNode;
}) {
	const subscriberRef = useRef<RealtimeSubscriber | null>(null);

	const getSubscriber = useCallback(() => {
		subscriberRef.current ??= createSubscriber();
		return subscriberRef.current;
	}, [createSubscriber]);

	useEffect(
		() => () => {
			subscriberRef.current?.disconnect();
			subscriberRef.current = null;
		},
		[],
	);

	return <RealtimeContext value={getSubscriber}>{children}</RealtimeContext>;
}

/**
 * Listens to one event on one channel for the lifetime of the component.
 * Pass `null` as the channel to stay idle (e.g. until a game PIN is known).
 */
export function useRealtimeEvent<TPayload>(
	channel: string | null,
	event: string,
	handler: RealtimeHandler<TPayload>,
) {
	const getSubscriber = use(RealtimeContext);
	if (!getSubscriber) {
		throw new Error("useRealtimeEvent must be used inside <RealtimeProvider>");
	}

	const onEvent = useEffectEvent(handler);

	useEffect(() => {
		if (!channel) return;
		return getSubscriber().subscribe<TPayload>(channel, event, (payload) =>
			onEvent(payload),
		);
	}, [channel, event, getSubscriber]);
}
