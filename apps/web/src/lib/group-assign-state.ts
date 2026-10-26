/** A quiz chosen in "Selecionar kahoot". */
export interface PickedQuiz {
	id: string;
	title: string;
	coverImageUrl?: string | null;
	questionCount?: number;
	ownerName?: string;
}

export interface AssignSettings {
	deadline: Date;
	options: {
		gameCharacters: boolean;
		questionTimer: boolean;
		randomizeAnswers: boolean;
	};
}

/**
 * The group's "Atribuir" flow (spec 038, RN-04 to RN-11): "Selecionar
 * kahoot", "Configurações da atividade atribuída" and "Criar publicação".
 * The X of the message goes back to the choice keeping the rest, and the
 * new choice comes back to the message.
 */
export interface GroupAssignState {
	step: "closed" | "select" | "configure" | "message";
	quiz: PickedQuiz | null;
	/** Kept from the settings dialog once "Adicionar mensagem" was used. */
	settings: AssignSettings | null;
	message: string;
	/** Where a pick goes: the settings, or back to the message after X. */
	afterPick: "configure" | "message";
}

export type GroupAssignAction =
	| { type: "open" }
	| { type: "pick"; quiz: PickedQuiz }
	| ({ type: "addMessage" } & AssignSettings)
	| { type: "message"; text: string }
	| { type: "removeQuiz" }
	| { type: "close" };

export const initialGroupAssignState: GroupAssignState = {
	step: "closed",
	quiz: null,
	settings: null,
	message: "",
	afterPick: "configure",
};

export function groupAssignReducer(
	state: GroupAssignState,
	action: GroupAssignAction,
): GroupAssignState {
	switch (action.type) {
		case "open":
			return { ...initialGroupAssignState, step: "select" };
		case "pick":
			return { ...state, quiz: action.quiz, step: state.afterPick };
		case "addMessage":
			return {
				...state,
				step: "message",
				settings: { deadline: action.deadline, options: action.options },
			};
		case "message":
			return { ...state, message: action.text };
		case "removeQuiz":
			return { ...state, step: "select", quiz: null, afterPick: "message" };
		case "close":
			return initialGroupAssignState;
	}
}
