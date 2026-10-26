/** Background classes of the users' icons, as Kahoot's colored circles. */
export const USER_COLORS = [
	"bg-answer-blue",
	"bg-success",
	"bg-brand",
	"bg-answer-red",
	"bg-answer-yellow",
] as const;

/** The same user always gets the same color (spec 034). */
export function userColor(userId: string): (typeof USER_COLORS)[number] {
	let hash = 0;
	for (const char of userId) {
		hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
	}
	return USER_COLORS[hash % USER_COLORS.length] ?? USER_COLORS[0];
}
