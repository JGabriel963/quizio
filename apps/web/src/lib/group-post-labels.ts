import { timeLeft } from "./time-until";

/** "0 curtidas", "1 curtida" (spec 038, RN-18). */
export function likesLabel(count: number): string {
	return `${count} ${count === 1 ? "curtida" : "curtidas"}`;
}

const dayAndMonth = new Intl.DateTimeFormat("pt-BR", {
	day: "numeric",
	month: "long",
});
const hourAndMinute = new Intl.DateTimeFormat("pt-BR", {
	hour: "2-digit",
	minute: "2-digit",
});

/** "26 de outubro às 15:01", as Kahoot dates a post (RN-14). */
export function postDateLabel(date: Date): string {
	return `${dayAndMonth.format(date)} às ${hourAndMinute.format(date)}`;
}

/** "3 dias": the Atribuições tab's time left, without "em" (RN-23). */
export function timeLeftLabel(remainingMs: number): string {
	return timeLeft(remainingMs);
}
