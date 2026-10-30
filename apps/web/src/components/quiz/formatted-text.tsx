import {
	formattedSegments,
	NO_FORMATTING,
	type TextFormatting,
	type TextMark,
} from "@quizio/core/shared/domain/text-formatting";
import { cn } from "@quizio/ui/lib/utils";
import type { ReactNode } from "react";

interface MarkNode {
	mark: TextMark;
	children: (MarkNode | string)[];
}

/**
 * The pieces nested by their marks, keeping a mark open across the pieces
 * that share it: "Quanto" in bold with "nto" also in italic is one `strong`.
 */
function markTree(text: string, formatting: TextFormatting) {
	const root: (MarkNode | string)[] = [];
	const open: MarkNode[] = [];
	for (const segment of formattedSegments(text, formatting)) {
		let kept = 0;
		while (kept < open.length && segment.marks[kept] === open[kept]?.mark) {
			kept++;
		}
		open.length = kept;
		for (const mark of segment.marks.slice(kept)) {
			const node: MarkNode = { mark, children: [] };
			(open.at(-1)?.children ?? root).push(node);
			open.push(node);
		}
		(open.at(-1)?.children ?? root).push(segment.text);
	}
	return root;
}

const ELEMENT_OF = {
	bold: "strong",
	italic: "em",
	subscript: "sub",
	superscript: "sup",
} as const;

function draw(nodes: (MarkNode | string)[]): ReactNode[] {
	return nodes.map((node, index) => {
		if (typeof node === "string") {
			return node;
		}
		const Element = ELEMENT_OF[node.mark];
		// Pieces never move, so their place is their key.
		return <Element key={index}>{draw(node.children)}</Element>;
	});
}

/**
 * A statement with its formatting (spec 047, RN-24 to RN-26): the plain text
 * in normal weight, so bold stands out, and the marked pieces as `strong`,
 * `em`, `sub` and `sup` (the preflight keeps sub and sup from spreading the
 * lines). The text goes in as text nodes, never as HTML.
 */
export function FormattedText({
	text,
	formatting,
	className,
}: {
	text: string;
	/**
	 * Undefined only in data shaped before spec 047, such as a stage event an
	 * older server published during a deploy: drawn as plain text.
	 */
	formatting: TextFormatting | undefined;
	className?: string;
}) {
	return (
		<span className={cn("font-normal", className)}>
			{draw(markTree(text, formatting ?? NO_FORMATTING))}
		</span>
	);
}
