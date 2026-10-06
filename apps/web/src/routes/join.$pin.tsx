import { createFileRoute } from "@tanstack/react-router";

/** `/join/{PIN}`, the join link: the parent route reads the PIN (spec 008, RN-37). */
export const Route = createFileRoute("/join/$pin")({ component: () => null });
