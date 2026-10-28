import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { isThemeFileKeyOwnedBy } from "../../shared/domain/media-key";
import {
	type ThemeLook,
	themeLookFileKeys,
} from "../../shared/domain/theme-look";
import { ThemeUploadNotFoundError } from "../domain/theme-errors";
import type { ThemeFileUsage } from "./ports/theme-file-usage";

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
 * A theme's files belong to it until no game copied them either (RN-28).
 * Called after the theme is written. Best effort: a failure leaves an orphan
 * object behind, never a failed edit.
 */
export async function releaseUnusedThemeFiles(
	deps: {
		fileUsage: ThemeFileUsage;
		storage: Pick<ObjectStorage, "delete">;
	},
	dropped: readonly string[],
): Promise<void> {
	if (dropped.length === 0) {
		return;
	}
	try {
		const copied = await deps.fileUsage.inUse(dropped);
		await Promise.all(
			dropped
				.filter((key) => !copied.has(key))
				.map((key) => deps.storage.delete(key)),
		);
	} catch {
		// Orphans are swept by the cleanup routine of ADR 0003.
	}
}
