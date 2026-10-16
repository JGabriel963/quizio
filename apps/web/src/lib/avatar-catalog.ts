import type { AccessoryId, CharacterId } from "@quizio/core/game/domain/avatar";

/**
 * Where an accessory is drawn over the face (spec 027, plan "UI"): on top of
 * the head, over the eyes, over the ears, under the chin or beside the head.
 */
export type AccessorySlot = "top" | "eyes" | "ears" | "neck" | "side";

/**
 * Where a drawing sits in the avatar's square, in percent of its side. Without
 * `height` it is a square. Each slot has one (`components/game/avatar.tsx`);
 * an accessory whose drawing does not fill its box the usual way brings its own.
 */
export interface AccessoryBox {
	left: number;
	top: number;
	width: number;
	height?: number;
}

export interface CharacterItem {
	id: CharacterId;
	label: string;
	src: string;
}

export interface AccessoryItem {
	id: AccessoryId;
	label: string;
	src: string;
	slot: AccessorySlot;
	box?: AccessoryBox;
}

const character = (id: CharacterId, label: string): CharacterItem => ({
	id,
	label,
	src: `/avatars/characters/${id}.svg`,
});

const accessory = (
	id: AccessoryId,
	label: string,
	slot: AccessorySlot,
	box?: AccessoryBox,
): AccessoryItem => ({
	id,
	label,
	slot,
	src: `/avatars/accessories/${id}.svg`,
	...(box && { box }),
});

/**
 * The drawings and the names of the core's ids, in the order of the editor's
 * grid. The art is Fluent Emoji Flat, MIT (ADR 0012, `public/avatars`).
 */
export const AVATAR_CATALOG = {
	characters: [
		character("koala", "Coala"),
		character("tiger", "Tigre"),
		character("fox", "Raposa"),
		character("bear", "Urso"),
		character("panda", "Panda"),
		character("frog", "Sapo"),
		character("monkey", "Macaco"),
		character("dog", "Cachorro"),
		character("cat", "Gato"),
		character("mouse", "Rato"),
		character("hamster", "Hamster"),
		character("rabbit", "Coelho"),
		character("cow", "Vaca"),
		character("pig", "Porco"),
		character("lion", "Leão"),
		character("unicorn", "Unicórnio"),
		character("dragon", "Dragão"),
		character("wolf", "Lobo"),
		character("boar", "Javali"),
		character("horse", "Cavalo"),
		character("polar-bear", "Urso-polar"),
		character("ogre", "Ogro"),
		character("goblin", "Duende"),
		character("alien", "Alienígena"),
		character("robot", "Robô"),
		character("ghost", "Fantasma"),
		character("skull", "Caveira"),
		character("clown", "Palhaço"),
		character("sun", "Sol"),
		character("moon", "Lua"),
	],
	accessories: [
		accessory("top-hat", "Cartola", "top"),
		accessory("crown", "Coroa", "top"),
		accessory("graduation-cap", "Capelo", "top", {
			left: 20,
			top: -7,
			width: 60,
		}),
		accessory("billed-cap", "Boné", "top", { left: 18, top: -8, width: 62 }),
		accessory("military-helmet", "Capacete", "top", {
			left: 18,
			top: -6,
			width: 64,
		}),
		accessory("sunglasses", "Óculos escuros", "eyes"),
		accessory("glasses", "Óculos", "eyes"),
		accessory("goggles", "Óculos de natação", "eyes", {
			left: 20,
			top: 16,
			width: 60,
		}),
		accessory("headphone", "Fone de ouvido", "ears"),
		accessory("ribbon", "Laço", "side"),
		accessory("necktie", "Gravata", "neck"),
		accessory("scarf", "Cachecol", "neck", {
			left: 16,
			top: 68,
			width: 68,
			height: 34,
		}),
		accessory("jack-o-lantern", "Abóbora", "side"),
		accessory("hibiscus", "Hibisco", "side"),
		accessory("cherry-blossom", "Flor de cerejeira", "side"),
		accessory("sunflower", "Girassol", "side"),
		accessory("butterfly", "Borboleta", "side"),
		accessory("star", "Estrela", "side"),
		accessory("sparkles", "Brilhos", "side"),
		accessory("red-heart", "Coração", "side"),
		accessory("gem", "Joia", "side"),
		accessory("balloon", "Balão", "side"),
		accessory("musical-notes", "Notas musicais", "side"),
		accessory("rainbow", "Arco-íris", "side"),
		accessory("snowflake", "Floco de neve", "side"),
		accessory("fire", "Fogo", "side"),
	],
} as const satisfies {
	characters: readonly CharacterItem[];
	accessories: readonly AccessoryItem[];
};

/** The head the accessory tab draws each accessory on (RN-11, CA-07). */
export const NEUTRAL_HEAD_SRC = "/avatars/neutral-head.svg";

export function characterOf(id: CharacterId): CharacterItem {
	return (
		AVATAR_CATALOG.characters.find((item) => item.id === id) ??
		AVATAR_CATALOG.characters[0]
	);
}

export function accessoryOf(id: AccessoryId): AccessoryItem {
	return (
		AVATAR_CATALOG.accessories.find((item) => item.id === id) ??
		AVATAR_CATALOG.accessories[0]
	);
}
