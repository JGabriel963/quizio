import type { AppRouter } from "@quizio/api/routers/index";
import type { inferRouterOutputs } from "@trpc/server";

type RouterOutputs = inferRouterOutputs<AppRouter>;

/** A quiz as listed in the library (dates arrive as ISO strings over HTTP). */
export type LibraryItemView = RouterOutputs["library"]["list"][number];

/** A quiz as shown on its details page. */
export type QuizDetailsData = RouterOutputs["quiz"]["get"];
