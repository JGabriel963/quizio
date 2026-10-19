/** A social network or app to share the activity in (spec 029, RN-23). */
export interface ShareTarget {
	name: string;
	href: string;
}

/**
 * Where "Compartilhar" offers to send the activity when the device has no
 * share sheet of its own. Each one opens the network's own share page.
 */
export function shareTargets(input: {
	message: string;
	link: string;
	subject: string;
}): ShareTarget[] {
	const message = encodeURIComponent(input.message);
	const link = encodeURIComponent(input.link);
	return [
		{ name: "WhatsApp", href: `https://wa.me/?text=${message}` },
		{
			name: "Telegram",
			href: `https://t.me/share/url?url=${link}&text=${message}`,
		},
		{
			name: "Facebook",
			href: `https://www.facebook.com/sharer/sharer.php?u=${link}`,
		},
		{ name: "X", href: `https://x.com/intent/post?text=${message}` },
		{
			name: "E-mail",
			href: `mailto:?subject=${encodeURIComponent(input.subject)}&body=${message}`,
		},
	];
}
