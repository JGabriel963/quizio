import type { Shuffler } from "../../shared/application/ports/shuffler";
import { DomainError } from "../../shared/domain/domain-error";

/**
 * The characters a player may be (spec 027, RN-02), in the order of the
 * editor's grid. An id never changes drawing: new art is a new id (ADR 0012).
 * The drawings and the Portuguese names live in the web's catalog.
 */
export const CHARACTER_IDS = [
	"koala",
	"tiger",
	"fox",
	"bear",
	"panda",
	"frog",
	"monkey",
	"dog",
	"cat",
	"mouse",
	"hamster",
	"rabbit",
	"cow",
	"pig",
	"lion",
	"unicorn",
	"dragon",
	"wolf",
	"boar",
	"horse",
	"polar-bear",
	"ogre",
	"goblin",
	"alien",
	"robot",
	"ghost",
	"skull",
	"clown",
	"sun",
	"moon",
] as const;

/** What goes over the character (RN-01); "Nenhum" is no accessory (RN-04). */
export const ACCESSORY_IDS = [
	"top-hat",
	"crown",
	"graduation-cap",
	"billed-cap",
	"military-helmet",
	"sunglasses",
	"glasses",
	"goggles",
	"headphone",
	"ribbon",
	"necktie",
	"scarf",
	"jack-o-lantern",
	"hibiscus",
	"cherry-blossom",
	"sunflower",
	"butterfly",
	"star",
	"sparkles",
	"red-heart",
	"gem",
	"balloon",
	"musical-notes",
	"rainbow",
	"snowflake",
	"fire",
] as const;

export type CharacterId = (typeof CHARACTER_IDS)[number];
export type AccessoryId = (typeof ACCESSORY_IDS)[number];

export interface Avatar {
	character: CharacterId;
	/** Null is "Nenhum" (RN-04). */
	accessory: AccessoryId | null;
}

/** An avatar as it arrives: two strings nobody checked yet. */
export interface AvatarInput {
	character: string;
	accessory: string | null;
}

export class UnknownAvatarError extends DomainError {
	readonly code = "GAME.UNKNOWN_AVATAR";
}

function isCharacter(id: string): id is CharacterId {
	return (CHARACTER_IDS as readonly string[]).includes(id);
}

function isAccessory(id: string): id is AccessoryId {
	return (ACCESSORY_IDS as readonly string[]).includes(id);
}

/** Null for anything outside the catalog. */
export function knownAvatar(input: AvatarInput | null): Avatar | null {
	if (!input || !isCharacter(input.character)) {
		return null;
	}
	if (input.accessory !== null && !isAccessory(input.accessory)) {
		return null;
	}
	return { character: input.character, accessory: input.accessory };
}

/** Only avatars of the catalog are taken (RN-06). */
export function parseAvatar(input: AvatarInput): Avatar {
	const avatar = knownAvatar(input);
	if (!avatar) {
		throw new UnknownAvatarError("The avatar is not in the catalog");
	}
	return avatar;
}

/** Any character with any accessory: who joins never has to choose (RN-07). */
export function drawAvatar(shuffler: Shuffler): Avatar {
	const [character] = shuffler.shuffle(CHARACTER_IDS);
	const [accessory] = shuffler.shuffle(ACCESSORY_IDS);
	return {
		character: character ?? CHARACTER_IDS[0],
		accessory: accessory ?? null,
	};
}
