import { cn } from "@quizio/ui/lib/utils";
import { UserIcon } from "lucide-react";

import { userColor } from "@/lib/user-color";

/**
 * A user's photo (spec 039, RN-06), or the round icon in their own color, as
 * in Kahoot's groups (spec 034). Decorative: the name always sits beside it.
 * Round everywhere but on the profile card, where it is a rounded square.
 */
export function UserAvatar({
	userId,
	photoUrl = null,
	size = "md",
	shape = "round",
	className,
}: {
	userId: string;
	photoUrl?: string | null;
	size?: "sm" | "md" | "lg" | "xl";
	shape?: "round" | "square";
	className?: string;
}) {
	return (
		<span
			aria-hidden="true"
			data-slot="user-avatar"
			data-shape={shape}
			className={cn(
				"inline-flex shrink-0 items-center justify-center overflow-hidden text-white ring-2 ring-background",
				shape === "round" ? "rounded-full" : "rounded-lg",
				!photoUrl && userColor(userId),
				size === "sm" && "size-7 [&>svg]:size-4",
				size === "md" && "size-8 [&>svg]:size-4",
				size === "lg" && "size-10 [&>svg]:size-5",
				size === "xl" && "size-20 [&>svg]:size-10",
				className,
			)}
		>
			{photoUrl ? (
				<img src={photoUrl} alt="" className="size-full object-cover" />
			) : (
				<UserIcon />
			)}
		</span>
	);
}
