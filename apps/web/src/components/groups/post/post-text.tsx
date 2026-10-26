import { linkify } from "@/lib/linkify";

/**
 * A post's text as it was typed, line breaks kept, with its addresses as
 * links to a new tab (spec 036, RN-16). Only text nodes: nothing typed ever
 * becomes markup.
 */
export function PostText({ text }: { text: string }) {
	return (
		<p className="whitespace-pre-line break-words text-sm">
			{linkify(text).map((part, index) =>
				part.type === "link" ? (
					<a
						// The parts never move: their place is their identity.
						key={index}
						href={part.href}
						target="_blank"
						rel="noopener noreferrer nofollow"
						className="break-all text-primary underline-offset-2 hover:underline"
					>
						{part.text}
					</a>
				) : (
					part.text
				),
			)}
		</p>
	);
}
