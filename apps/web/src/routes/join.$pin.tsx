import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * `/join/{PIN}?game={id}`, the join link: the parent route reads the PIN
 * (spec 008, RN-37) and the game it names (RN-39a).
 */
export const Route = createFileRoute("/join/$pin")({
	validateSearch: z.object({
		game: z.string().min(1).max(64).optional().catch(undefined),
	}),
	component: () => null,
});
