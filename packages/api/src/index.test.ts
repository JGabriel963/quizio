import { DomainError } from "@quizio/core/shared/domain/domain-error";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { describe, expect, it } from "vitest";

import type { Context } from "./context";
import { publicProcedure, router } from "./index";

class QuizInTrashError extends DomainError {
	readonly code = "QUIZ.IN_TRASH";
}

const testRouter = router({
	failsInside: publicProcedure.query(() => {
		throw new Error(
			'Failed query: select "secret" from "game_player" where "id" = $1\nparams: player-1',
		);
	}),
	breaksARule: publicProcedure.query(() => {
		throw new QuizInTrashError("The quiz is in the trash");
	}),
});

async function call(path: string) {
	const response = await fetchRequestHandler({
		req: new Request(`http://localhost/api/trpc/${path}`),
		router: testRouter,
		createContext: () => ({}) as Context,
		endpoint: "/api/trpc",
	});
	const body = (await response.json()) as {
		error: {
			message: string;
			data: { code: string; domainCode: string | null; stack?: string };
		};
	};
	return body.error;
}

describe("tRPC errors as the client sees them", () => {
	it("an unexpected failure says nothing of what failed inside", async () => {
		const error = await call("failsInside");

		expect(error.data.code).toBe("INTERNAL_SERVER_ERROR");
		expect(error.message).toBe("Internal server error");
		expect(JSON.stringify(error)).not.toContain("game_player");
		expect(error.data.stack).toBeUndefined();
	});

	it("a business rule keeps its message and code", async () => {
		const error = await call("breaksARule");

		expect(error.data.code).toBe("BAD_REQUEST");
		expect(error.message).toBe("The quiz is in the trash");
		expect(error.data.domainCode).toBe("QUIZ.IN_TRASH");
	});
});
