import {
	GROUP_IMAGE_EXTENSIONS,
	GROUP_IMAGE_MAX_BYTES,
	GROUP_PDF_MAX_BYTES,
	type GroupFileType,
} from "@quizio/core/groups/domain/group-file";
import type { GroupPostHeadline } from "@quizio/core/groups/domain/group-post";

import { timeLeft } from "./time-until";

const HEADLINES: Record<GroupPostHeadline, string> = {
	message: "compartilhou uma mensagem",
	image: "compartilhou uma imagem",
	file: "compartilhou um arquivo",
	assignment: "atribuiu um kahoot",
	quiz: "compartilhou um kahoot",
	// "múltiplos kahoots" is a link of its own (spec 037, RN-09).
	quizzes: "compartilhou",
};

/** What follows the author's name in a post's header (spec 036, RN-17). */
export function postHeadlineLabel(headline: GroupPostHeadline): string {
	return HEADLINES[headline];
}

const KB = 1024;
const MB = 1024 * KB;
const sizeNumber = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

/** "2,4 MB", "850 KB": a PDF's size on its card (spec 036, RN-11). */
export function formatFileSize(bytes: number): string {
	if (bytes >= MB) {
		return `${sizeNumber.format(bytes / MB)} MB`;
	}
	if (bytes >= KB) {
		return `${Math.round(bytes / KB)} KB`;
	}
	return `${bytes} bytes`;
}

/**
 * The browser's own check of a chosen file, with the server's limits, so a
 * wrong one is told before anything is sent (spec 036, RN-09, RN-11).
 */
export function checkGroupFile(
	file: Pick<File, "type" | "size">,
	type: GroupFileType,
): string | null {
	if (type === "image") {
		if (!Object.hasOwn(GROUP_IMAGE_EXTENSIONS, file.type)) {
			return "Use uma imagem JPG, PNG, GIF ou WebP.";
		}
		return file.size > GROUP_IMAGE_MAX_BYTES
			? "A imagem passa de 10 MB."
			: null;
	}
	if (file.type !== "application/pdf") {
		return "Use um arquivo PDF.";
	}
	return file.size > GROUP_PDF_MAX_BYTES ? "O arquivo passa de 20 MB." : null;
}

/** "0 curtidas", "1 curtida" (spec 038, RN-18). */
export function likesLabel(count: number): string {
	return `${count} ${count === 1 ? "curtida" : "curtidas"}`;
}

/** "1 partida", "8 partidas": games started with a shared quiz (spec 037, RN-15). */
export function gamesLabel(count: number): string {
	return `${count} ${count === 1 ? "partida" : "partidas"}`;
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
