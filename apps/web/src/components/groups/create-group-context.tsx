import { createContext, useContext } from "react";

/**
 * Opens "Criar grupo" from anywhere in the groups' area: the column, the
 * list's button and its empty state (spec 034, RN-11). The layout owns the
 * dialog.
 */
export const CreateGroupContext = createContext<() => void>(() => {});

export function useOpenCreateGroup(): () => void {
	return useContext(CreateGroupContext);
}
