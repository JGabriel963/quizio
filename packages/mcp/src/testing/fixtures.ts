import type { TestApi } from "@quizio/api/testing/test-context";

import type { connectTestClient } from "./connect-test-client";

type TestClient = Awaited<ReturnType<typeof connectTestClient>>;

/** A quiz of one complete question, created and published by the agent. */
export async function publishedQuiz(
	client: TestClient,
	title = "Capitais",
): Promise<string> {
	const { quiz } = (await client.ok("create_quiz", {
		title,
		questions: [
			{
				type: "quiz",
				text: "Capital da França?",
				choices: [
					{ text: "Paris", correct: true },
					{ text: "Lyon", correct: false },
				],
			},
		],
	})) as { quiz: { id: string } };
	await client.ok("publish_quiz", { quizId: quiz.id });
	return quiz.id;
}

/** A group of `adminId` with the members who accepted its invite. */
export async function groupOf(
	api: TestApi,
	adminId: string,
	memberIds: readonly string[] = [],
	name = "Turma A",
): Promise<string> {
	const { createGroup, getGroupInvite, acceptGroupInvite } =
		api.container.useCases;
	const { groupId } = await createGroup({ userId: adminId, name });
	const { code } = await getGroupInvite({ userId: adminId, groupId });
	for (const userId of memberIds) {
		await acceptGroupInvite({ userId, code });
	}
	return groupId;
}
