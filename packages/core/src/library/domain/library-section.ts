/** Sections of the creator's library (spec 001, RN-16/17/21). */
export const LIBRARY_SECTIONS = ["recent", "drafts", "trash"] as const;

export type LibrarySection = (typeof LIBRARY_SECTIONS)[number];
