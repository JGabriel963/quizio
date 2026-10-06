import { createFileRoute } from "@tanstack/react-router";

/** `/join`: the screen is the parent route's; this only names the address. */
export const Route = createFileRoute("/join/")({ component: () => null });
