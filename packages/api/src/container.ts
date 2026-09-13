import {
	createRequestMediaUpload,
	type RequestMediaUpload,
} from "@quizio/core/media/application/request-media-upload";
import type { Clock } from "@quizio/core/shared/application/ports/clock";
import type { IdGenerator } from "@quizio/core/shared/application/ports/id-generator";
import type { ObjectStorage } from "@quizio/core/shared/application/ports/object-storage";
import type { RealtimePublisher } from "@quizio/core/shared/application/ports/realtime-publisher";

/** Driven adapters the application needs. Production wiring lives in composition-root.ts. */
export interface Adapters {
	storage: ObjectStorage;
	realtime: RealtimePublisher;
	ids: IdGenerator;
	clock: Clock;
}

export interface Container extends Adapters {
	useCases: {
		requestMediaUpload: RequestMediaUpload;
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
		},
	};
}
