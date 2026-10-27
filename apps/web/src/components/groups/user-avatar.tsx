import { cn } from "@quizio/ui/lib/utils";
import { UserIcon } from "lucide-react";

import { userColor } from "@/lib/user-color";

/**
 * A user's round icon in their own color, as in Kahoot's groups (spec 034).
 * Decorative: the name always sits beside it.
 */
export function UserAvatar({
	userId,
	size = "md",
	className,
}: {
	userId: string;
	size?: "sm" | "md" | "lg";
	className?: string;
}) {
	return (
		<span
			aria-hidden="true"
			data-slot="user-avatar"
			className={cn(
				"inline-flex shrink-0 items-center justify-center rounded-full text-white ring-2 ring-background",
				userColor(userId),
				size === "sm" && "size-7 [&>svg]:size-4",
				size === "md" && "size-8 [&>svg]:size-4",
				size === "lg" && "size-10 [&>svg]:size-5",
				className,
			)}
		>
			<UserIcon />
		</span>
	);
}
