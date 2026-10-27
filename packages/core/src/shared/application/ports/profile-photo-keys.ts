/**
 * The profile photo keys of some users, for every screen that shows a person
 * (spec 039, RN-06; ADR 0019). Identity keeps the photos; the other contexts
 * only read the keys through this port.
 */
export interface ProfilePhotoKeys {
	keysOf(userIds: readonly string[]): Promise<Map<string, string>>;
}
