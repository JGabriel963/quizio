"use client";

import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import { cn } from "@quizio/ui/lib/utils";

/**
 * How much of a task is done, as a bar: a file being sent, for one (spec
 * 036). `value` goes from 0 to 100; null is a task of unknown length.
 */
function Progress({
	className,
	children,
	...props
}: ProgressPrimitive.Root.Props) {
	return (
		<ProgressPrimitive.Root
			data-slot="progress"
			className={cn("flex w-full flex-col gap-1", className)}
			{...props}
		>
			{children}
			<ProgressPrimitive.Track
				data-slot="progress-track"
				className="relative h-2 w-full overflow-hidden rounded-full bg-muted"
			>
				<ProgressPrimitive.Indicator
					data-slot="progress-indicator"
					className="h-full rounded-full bg-primary transition-all"
				/>
			</ProgressPrimitive.Track>
		</ProgressPrimitive.Root>
	);
}

export { Progress };
