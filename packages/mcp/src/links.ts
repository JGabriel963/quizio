/**
 * The Quizio screens an answer points to (spec 044, RN-11), so the person
 * opens what the agent made. Built from the instance's public origin.
 */
export interface QuizioLinks {
	library(): string;
	editor(quizId: string): string;
	quiz(quizId: string): string;
	hostScreen(gameId: string): string;
	join(pin: string): string;
	assignment(gameId: string): string;
	report(gameId: string): string;
	group(groupId: string): string;
	groupPost(groupId: string, postId: string): string;
	invite(code: string): string;
	sharedQuiz(groupId: string, quizId: string): string;
	profile(userId: string): string;
	publicQuiz(userId: string, quizId: string): string;
	agentsSettings(): string;
}

export function quizioLinks(publicUrl: string): QuizioLinks {
	const origin = publicUrl.replace(/\/+$/, "");
	const at = (path: string) => `${origin}${path}`;
	const id = encodeURIComponent;
	return {
		library: () => at("/library"),
		editor: (quizId) => at(`/creator/${id(quizId)}`),
		quiz: (quizId) => at(`/quizzes/${id(quizId)}`),
		hostScreen: (gameId) => at(`/host/${id(gameId)}`),
		join: (pin) => at(`/join/${id(pin)}`),
		assignment: (gameId) => at(`/assignment/${id(gameId)}`),
		report: (gameId) => at(`/reports/${id(gameId)}`),
		group: (groupId) => at(`/groups/${id(groupId)}`),
		groupPost: (groupId, postId) =>
			at(`/groups/${id(groupId)}/posts/${id(postId)}`),
		invite: (code) => at(`/invite/${id(code)}`),
		sharedQuiz: (groupId, quizId) =>
			at(`/groups/${id(groupId)}/quizzes/${id(quizId)}`),
		profile: (userId) => at(`/profile/${id(userId)}`),
		publicQuiz: (userId, quizId) =>
			at(`/profile/${id(userId)}/quizzes/${id(quizId)}`),
		agentsSettings: () => at("/settings?section=agents"),
	};
}
