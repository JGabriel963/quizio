import type { Avatar as AvatarValue } from "@quizio/core/game/domain/avatar";
import { cn } from "@quizio/ui/lib/utils";
import type { CSSProperties } from "react";

import {
	type AccessorySlot,
	accessoryOf,
	characterOf,
} from "@/lib/avatar-catalog";

/** Where the face sits in the square: room is left above it for a hat. */
const FACE: CSSProperties = {
	left: "12%",
	top: "18%",
	width: "76%",
	height: "76%",
};

/** Where each kind of accessory sits, in fractions of the square. */
export const ACCESSORY_PLACEMENT: Record<AccessorySlot, CSSProperties> = {
	top: { left: "22%", top: "-13%", width: "56%", height: "56%" },
	eyes: { left: "22%", top: "30%", width: "56%", height: "56%" },
	ears: { left: "0%", top: "6%", width: "100%", height: "100%" },
	neck: { left: "32%", top: "68%", width: "36%", height: "36%" },
	side: { left: "62%", top: "0%", width: "38%", height: "38%" },
};

/**
 * A player's avatar: the character, with the accessory drawn over it (spec
 * 027, RN-01). Beside a nickname it says nothing to screen readers (RN-20).
 * The size comes from `className`. With `animateOnChange`, a new avatar pops
 * in (RN-21); `motion-safe` leaves it still with reduced motion.
 */
export function Avatar({
	avatar,
	animateOnChange = false,
	className,
}: {
	avatar: AvatarValue;
	animateOnChange?: boolean;
	className?: string;
}) {
	const character = characterOf(avatar.character);
	const accessory = avatar.accessory ? accessoryOf(avatar.accessory) : null;
	return (
		<span
			data-slot="avatar"
			aria-hidden="true"
			className={cn("relative inline-block size-10 shrink-0", className)}
		>
			<span
				// A new key replays the entrance when the avatar changes.
				key={
					animateOnChange ? `${avatar.character}/${avatar.accessory}` : "art"
				}
				data-slot="avatar-art"
				className={cn(
					"absolute inset-0",
					animateOnChange && "motion-safe:animate-pop-in",
				)}
			>
				<img
					src={character.src}
					alt=""
					draggable={false}
					className="absolute"
					style={FACE}
				/>
				{accessory && (
					<img
						src={accessory.src}
						alt=""
						draggable={false}
						className="absolute"
						style={ACCESSORY_PLACEMENT[accessory.slot]}
					/>
				)}
			</span>
		</span>
	);
}
