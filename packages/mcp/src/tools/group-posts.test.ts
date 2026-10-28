import { describe, expect, it } from "vitest";

import { connectTestClient } from "../testing/connect-test-client";
import { groupOf, publishedQuiz } from "../testing/fixtures";

const PNG = Uint8Array.from([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1,
]);

interface PostOut {
	id: string;
	headline: string;
	author: { userId: string };
	likeCount: number;
	liked: boolean;
}

async function setup() {
	const ana = await connectTestClient({ userId: "ana" });
	const bruno = await connectTestClient({ api: ana.api, userId: "bruno" });
	const carla = await connectTestClient({ api: ana.api, userId: "carla" });
	const groupId = await groupOf(ana.api, "ana", ["bruno", "carla"]);
	return { ana, bruno, carla, groupId, api: ana.api };
}

describe("group feed tools (spec 044, RN-29)", () => {
	it("create_group_post with text and an image by link appears as the caller's and signals the other members", async () => {
		const { bruno, groupId, api } = await setup();
		api.remoteFiles.serve("https://example.com/mapa.png", { bytes: PNG });
		api.realtime.messages.length = 0;

		const posted = await bruno.ok("create_group_post", {
			groupId,
			message: "Mapa para a prova",
			attachment: { file: { url: "https://example.com/mapa.png" } },
		});

		const post = posted.post as PostOut & { file: { url: string } };
		expect(post).toMatchObject({
			headline: "image",
			message: "Mapa para a prova",
			author: { userId: "bruno" },
		});
		expect(post.file.url).toContain(`groups/${groupId}/`);
		expect(posted.links).toEqual({
			post: `https://quizio.test/groups/${groupId}/posts/${post.id}`,
		});
		expect(api.realtime.messages.map(({ channel }) => channel).sort()).toEqual([
			"inbox-ana",
			"inbox-carla",
		]);
	});

	it("a post with an assignment needs the assign permission", async () => {
		const { ana, bruno, groupId } = await setup();
		const quizId = await publishedQuiz(bruno);
		const anaQuiz = await publishedQuiz(ana, "Rios");
		const assignment = (id: string) => ({
			groupId,
			message: "Para sexta",
			attachment: {
				assignment: { quizId: id, deadline: "2026-06-05T23:59:00-03:00" },
			},
		});

		expect(
			(await bruno.call("create_group_post", assignment(quizId))).data.error,
		).toMatchObject({ code: "GROUP.ASSIGN_NOT_ALLOWED" });

		const posted = await ana.ok("create_group_post", assignment(anaQuiz));

		const { gameId } = posted.assignment as { gameId: string };
		expect(posted.post).toMatchObject({ headline: "assignment", gameId });
		expect(posted.links).toMatchObject({
			report: `https://quizio.test/reports/${gameId}`,
		});
		const { assignments } = await bruno.ok("list_group_assignments", {
			groupId,
		});
		expect(assignments).toEqual([
			expect.objectContaining({
				gameId,
				link: `https://quizio.test/assignment/${gameId}`,
			}),
		]);
	});

	it("a post with a shared quiz, share_quizzes_with_group with up to 50, and unshare_quiz_from_group", async () => {
		const { ana, bruno, groupId } = await setup();
		const first = await publishedQuiz(ana, "Rios");
		const second = await publishedQuiz(ana, "Mares");
		const third = await publishedQuiz(ana, "Lagos");

		const one = await ana.ok("create_group_post", {
			groupId,
			message: "Treinem com este",
			attachment: { sharedQuiz: { quizId: first } },
		});
		expect(one.post).toMatchObject({
			headline: "quiz",
			quiz: { quizId: first, title: "Rios" },
		});
		const many = await ana.ok("share_quizzes_with_group", {
			groupId,
			quizIds: [second, third],
		});
		expect(many.post).toMatchObject({ headline: "quizzes" });
		expect(
			(
				await ana.call("share_quizzes_with_group", {
					groupId,
					quizIds: Array.from({ length: 51 }, (_, index) => `q-${index}`),
				})
			).isError,
		).toBe(true);

		const listed = await bruno.ok("list_group_shared_quizzes", {
			groupId,
			sort: "nameAsc",
		});
		expect(
			(listed.quizzes as { title: string; link: string }[]).map(
				({ title }) => title,
			),
		).toEqual(["Lagos", "Mares", "Rios"]);
		expect((listed.quizzes as { link: string }[])[0]?.link).toBe(
			`https://quizio.test/groups/${groupId}/quizzes/${third}`,
		);

		await ana.ok("unshare_quiz_from_group", { groupId, quizId: second });

		expect(
			(
				(await bruno.ok("list_group_shared_quizzes", { groupId }))
					.quizzes as unknown[]
			).length,
		).toBe(2);
	});

	it("list_group_feed pages by cursor; get_group_post; set_post_like; delete_group_post by author or admin", async () => {
		const { ana, bruno, carla, groupId } = await setup();
		for (let index = 1; index <= 21; index++) {
			await (index % 2 ? ana : bruno).ok("create_group_post", {
				groupId,
				message: `Aviso ${index}`,
			});
		}

		const first = await carla.ok("list_group_feed", { groupId });
		const second = await carla.ok("list_group_feed", {
			groupId,
			cursor: first.nextCursor,
		});

		expect((first.posts as unknown[]).length).toBe(20);
		expect((second.posts as unknown[]).length).toBe(1);
		expect(second.nextCursor).toBeNull();

		const posts = [
			...(first.posts as (PostOut & { message: string })[]),
			...(second.posts as (PostOut & { message: string })[]),
		];
		const byBruno = posts.find((post) => post.author.userId === "bruno");
		const byAna = posts.find((post) => post.author.userId === "ana");
		if (!byBruno || !byAna) {
			throw new Error("both posted");
		}
		const liked = await carla.ok("set_post_like", {
			groupId,
			postId: byBruno.id,
			liked: true,
		});
		expect(liked).toEqual({ liked: true, likeCount: 1 });
		expect(
			(await bruno.ok("get_group_post", { groupId, postId: byBruno.id })).post,
		).toMatchObject({ likeCount: 1, liked: false });

		expect(
			(await carla.call("delete_group_post", { groupId, postId: byBruno.id }))
				.data.error,
		).toMatchObject({ code: "GROUP.POST_DELETE_NOT_ALLOWED" });
		await bruno.ok("delete_group_post", { groupId, postId: byBruno.id });
		await ana.ok("delete_group_post", { groupId, postId: byAna.id });
		expect(
			(await carla.call("get_group_post", { groupId, postId: byBruno.id })).data
				.error,
		).toMatchObject({ code: "GROUP.POST_NOT_FOUND" });
	});

	it("list_group_shared_quizzes and list_group_assignments", async () => {
		const { ana, bruno, groupId, api } = await setup();
		await api.container.useCases.setGroupPermission({
			userId: "ana",
			groupId,
			permission: "membersCanAssign",
			value: true,
		});
		const quizId = await publishedQuiz(bruno);
		await bruno.ok("share_quizzes_with_group", { groupId, quizIds: [quizId] });
		await bruno.ok("create_group_post", {
			groupId,
			attachment: {
				assignment: {
					quizId,
					deadline: "2026-06-03T12:00:00Z",
					options: { questionTimer: false },
				},
			},
		});

		const shared = await ana.ok("list_group_shared_quizzes", { groupId });
		const assigned = await ana.ok("list_group_assignments", {
			groupId,
			sort: "deadline",
		});

		expect(shared).toMatchObject({
			quizzes: [{ quizId, owner: { userId: "bruno" } }],
			hasMore: false,
		});
		expect(assigned.assignments).toEqual([
			expect.objectContaining({
				assignedBy: expect.objectContaining({ userId: "bruno" }),
			}),
		]);
	});
});
