/** "Grupos que gerencio" and "Grupos em que participo" (spec 034, RN-07). */
export const GROUP_SECTIONS = ["managed", "joined"] as const;
export type GroupSection = (typeof GROUP_SECTIONS)[number];

/** "Grupos recentes" (RN-10). */
export const RECENT_GROUPS_LIMIT = 5;

/** Member icons in the group's header (RN-13). */
export const GROUP_MEMBER_PREVIEW = 3;
