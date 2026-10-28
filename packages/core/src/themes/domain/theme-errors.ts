import { DomainError } from "../../shared/domain/domain-error";

export { ThemeNotFoundError } from "../../shared/domain/theme";

export class InvalidThemeNameError extends DomainError {
	readonly code = "THEME.INVALID_NAME";
	constructor() {
		super("A theme's name has 1 to 30 characters.");
	}
}

/** Not a `#RRGGBB` code, or an image with no tone (RN-06, RN-12). */
export class InvalidThemeColorError extends DomainError {
	readonly code = "THEME.INVALID_COLOR";
}

/** Neither light nor dark text reaches 4.5:1 on it (RN-11). */
export class IllegibleThemeColorError extends DomainError {
	readonly code = "THEME.ILLEGIBLE_COLOR";
	constructor() {
		super("Neither light nor dark text is legible on this color.");
	}
}

export class UnknownBackgroundPatternError extends DomainError {
	readonly code = "THEME.UNKNOWN_PATTERN";
	constructor() {
		super("Unknown background pattern.");
	}
}

/** A file that is neither the theme's own nor the owner's pending upload. */
export class ThemeUploadNotFoundError extends DomainError {
	readonly code = "THEME.UPLOAD_NOT_FOUND";
	constructor() {
		super("The theme's file was not uploaded.");
	}
}
