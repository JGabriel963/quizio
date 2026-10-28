/** Where a file taken from a link goes (spec 044, RN-24). */
export type RemoteFileTarget =
	/** A quiz cover or a question image: the owner's media. */
	| { kind: "media" }
	/** An attachment of a post in the group (spec 036). */
	| { kind: "groupFile"; groupId: string }
	/** A custom theme's logo or background (spec 043). */
	| { kind: "themeFile" };

/**
 * The upload each target already has, with its own policy and pending-upload
 * rows (media, group or theme). Wired in `container.ts` to those use cases, so
 * a file from a link follows the same rules as one from the browser.
 */
export interface RemoteFileUploads {
	/** The largest file the target takes, of any type it accepts. */
	maxBytesFor(target: RemoteFileTarget): number;
	keyFor(input: {
		ownerId: string;
		target: RemoteFileTarget;
		contentType: string;
		sizeBytes: number;
		fileName: string;
	}): Promise<{
		key: string;
		/** What the target's upload would have signed, kept with the object. */
		contentDisposition?: string;
	}>;
}
