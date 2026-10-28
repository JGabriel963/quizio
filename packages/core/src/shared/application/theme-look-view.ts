import type { ThemeTone } from "../domain/theme";
import type {
	BackgroundPatternId,
	HexColor,
	ThemeLook,
} from "../domain/theme-look";
import type { ObjectStorage } from "./ports/object-storage";

/**
 * A custom look as the screens draw it (spec 043, ADR 0022): the files as
 * public URLs built here, never on the client (ADR 0003).
 */
export interface ThemeLookView {
	/** Set with a pattern background, else null. */
	pattern: BackgroundPatternId | null;
	backgroundColor: HexColor | null;
	/** Set with an image background, else null. */
	imageUrl: string | null;
	imageTone: ThemeTone | null;
	accentColor: HexColor;
	/** Only the host's screens show the logo (RN-26). */
	logoUrl: string | null;
}

export function themeLookView(
	look: ThemeLook | null,
	storage: Pick<ObjectStorage, "getPublicUrl">,
	{ withLogo }: { withLogo: boolean },
): ThemeLookView | null {
	if (!look) {
		return null;
	}
	const { background } = look;
	return {
		pattern: background.kind === "pattern" ? background.pattern : null,
		backgroundColor: background.kind === "pattern" ? background.color : null,
		imageUrl:
			background.kind === "image" ? storage.getPublicUrl(background.key) : null,
		imageTone: background.kind === "image" ? background.tone : null,
		accentColor: look.accentColor,
		logoUrl:
			withLogo && look.logoKey ? storage.getPublicUrl(look.logoKey) : null,
	};
}
