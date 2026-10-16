import type { Avatar as AvatarValue } from "@quizio/core/game/domain/avatar";
import { cn } from "@quizio/ui/lib/utils";
import type { CSSProperties } from "react";

import {
	type AccessoryBox,
	type AccessoryItem,
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

/** Where each kind of accessory sits, unless the accessory brings its own box. */
const SLOT_BOX: Record<AccessorySlot, AccessoryBox> = {
	top: { left: 22, top: -13, width: 56 },
	eyes: { left: 22, top: 30, width: 56 },
	// The headphone's drawing is wider than tall, so its cups reach the ears.
	ears: { left: 2, top: 12, width: 96, height: 66 },
	neck: { left: 30, top: 62, width: 40 },
	side: { left: 62, top: 0, width: 38 },
};

/** The accessory's place over the face (and over the editor's neutral head). */
export function accessoryStyle(item: AccessoryItem): CSSProperties {
	const box = item.box ?? SLOT_BOX[item.slot];
	return {
		left: `${box.left}%`,
		top: `${box.top}%`,
		width: `${box.width}%`,
		height: `${box.height ?? box.width}%`,
	};
}

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
						style={accessoryStyle(accessory)}
					/>
				)}
			</span>
		</span>
	);
}
