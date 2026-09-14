import {
	createListLibrary,
	type ListLibrary,
} from "@quizio/core/library/application/list-library";
import type { LibraryQuizQuery } from "@quizio/core/library/application/ports/library-quiz-query";
import {
	createRequestMediaUpload,
	type RequestMediaUpload,
} from "@quizio/core/media/application/request-media-upload";
import {
	type CreateQuiz,
	createCreateQuiz,
} from "@quizio/core/quiz/application/create-quiz";
import {
	createDeleteQuizPermanently,
	type DeleteQuizPermanently,
} from "@quizio/core/quiz/application/delete-quiz-permanently";
import {
	createDuplicateQuiz,
	type DuplicateQuiz,
} from "@quizio/core/quiz/application/duplicate-quiz";
import {
	createGetQuizDetails,
	type GetQuizDetails,
} from "@quizio/core/quiz/application/get-quiz-details";
import {
	createMoveQuizToTrash,
	type MoveQuizToTrash,
} from "@quizio/core/quiz/application/move-quiz-to-trash";
import type { QuizRepository } from "@quizio/core/quiz/application/ports/quiz-repository";
import {
	createRestoreQuiz,
	type RestoreQuiz,
} from "@quizio/core/quiz/application/restore-quiz";
import {
	createUpdateQuizDetails,
	type UpdateQuizDetails,
} from "@quizio/core/quiz/application/update-quiz-details";
import type { Clock } from "@quizio/core/shared/application/ports/clock";
import type { IdGenerator } from "@quizio/core/shared/application/ports/id-generator";
import type { ObjectStorage } from "@quizio/core/shared/application/ports/object-storage";
import type { RealtimePublisher } from "@quizio/core/shared/application/ports/realtime-publisher";

/** Public sign-in options the login screen needs to know about. */
export interface AuthSettings {
	signUpEnabled: boolean;
	googleEnabled: boolean;
}

/** Driven adapters and settings the application needs. Production wiring lives in composition-root.ts. */
export interface Adapters {
	storage: ObjectStorage;
	realtime: RealtimePublisher;
	ids: IdGenerator;
	clock: Clock;
	quizzes: QuizRepository;
	libraryQuizzes: LibraryQuizQuery;
	authSettings: AuthSettings;
}

export interface Container extends Adapters {
	useCases: {
		requestMediaUpload: RequestMediaUpload;
		createQuiz: CreateQuiz;
		getQuizDetails: GetQuizDetails;
		updateQuizDetails: UpdateQuizDetails;
		duplicateQuiz: DuplicateQuiz;
		moveQuizToTrash: MoveQuizToTrash;
		restoreQuiz: RestoreQuiz;
		deleteQuizPermanently: DeleteQuizPermanently;
		listLibrary: ListLibrary;
	};
}

/**
 * Wires use cases to adapters. Pure function with no env access, so tests
 * build a container from in-memory fakes and exercise real routers.
 */
export function createContainer(adapters: Adapters): Container {
	return {
		...adapters,
		useCases: {
			requestMediaUpload: createRequestMediaUpload(adapters),
			createQuiz: createCreateQuiz(adapters),
			getQuizDetails: createGetQuizDetails(adapters),
			updateQuizDetails: createUpdateQuizDetails(adapters),
			duplicateQuiz: createDuplicateQuiz(adapters),
			moveQuizToTrash: createMoveQuizToTrash(adapters),
			restoreQuiz: createRestoreQuiz(adapters),
			deleteQuizPermanently: createDeleteQuizPermanently(adapters),
			listLibrary: createListLibrary(adapters),
		},
	};
}
