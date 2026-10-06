import { cn } from "@quizio/ui/lib/utils";

import type { PodiumPlace } from "@/lib/podium";

const MEDAL_CLASSES: Record<PodiumPlace, string> = {
	1: "bg-amber-400 text-amber-950 ring-amber-200",
	2: "bg-slate-300 text-slate-800 ring-slate-100",
	3: "bg-orange-600 text-white ring-orange-300",
};

/** The medal of a place on the podium: gold, silver or bronze (spec 011, RN-08, RN-20). */
export function Medal({
	place,
	className,
}: {
	place: PodiumPlace;
	className?: string;
}) {
	return (
		<span
			data-slot="medal"
			data-place={place}
			aria-hidden="true"
			className={cn(
				"flex size-14 items-center justify-center rounded-full font-black text-3xl shadow-lg ring-4",
				MEDAL_CLASSES[place],
				className,
			)}
		>
			{place}
		</span>
	);
}
