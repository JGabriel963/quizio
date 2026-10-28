import type { Clock } from "../../shared/application/ports/clock";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { isThemeFileKeyOwnedBy } from "../../shared/domain/media-key";
import {
	type ThemeLook,
	themeLookFileKeys,
} from "../../shared/domain/theme-look";
import { ThemeUploadNotFoundError } from "../domain/theme-errors";
import type { ThemeFileUsage } from "./ports/theme-file-usage";
import type { ThemeUploadRepository } from "./ports/theme-upload-repository";

/**
 * The look's files that are new to the theme, after checking each is the
 * owner's and in storage (spec 043, RN-07). Whether they are still pending
 * is checked when the theme is written, in the same transaction.
 */
export async function newUploadsOf(
	storage: Pick<ObjectStorage, "exists">,
	look: ThemeLook,
	ownerId: string,
	alreadyTheThemes: readonly string[] = [],
): Promise<string[]> {
	const kept = new Set(alreadyTheThemes);
	const fresh = themeLookFileKeys(look).filter((key) => !kept.has(key));
	for (const key of fresh) {
		if (!isThemeFileKeyOwnedBy(key, ownerId) || !(await storage.exists(key))) {
			throw new ThemeUploadNotFoundError();
		}
	}
	return fresh;
}

/**
 * The files a theme let go of (an edit or a delete) are not deleted now: a
 * game being created at the same moment may have read the old look and not
 * be written yet. They go back to the pending uploads, and the sweep deletes
 * them a day later unless a game copied them meanwhile (RN-28, RN-29).
 * Best effort: a failure leaves an orphan object, never a failed edit.
 */
export async function releaseThemeFiles(
	deps: {
		themeUploads: Pick<ThemeUploadRepository, "addThemeUpload">;
		clock: Clock;
	},
	ownerId: string,
	dropped: readonly string[],
): Promise<void> {
	try {
		const createdAt = deps.clock.now();
		await Promise.all(
			dropped.map((key) =>
				deps.themeUploads.addThemeUpload({ key, ownerId, createdAt }),
			),
		);
	} catch {
		// Orphans are swept by the cleanup routine of ADR 0003.
	}
}

/** Deletes the files no game copied; the others belong to their games now. */
export async function deleteUncopiedFiles(
	deps: {
		fileUsage: ThemeFileUsage;
		storage: Pick<ObjectStorage, "delete">;
	},
	keys: readonly string[],
): Promise<void> {
	if (keys.length === 0) {
		return;
	}
	const copied = await deps.fileUsage.inUse(keys);
	await Promise.all(
		keys
			.filter((key) => !copied.has(key))
			.map((key) => deps.storage.delete(key)),
	);
}
