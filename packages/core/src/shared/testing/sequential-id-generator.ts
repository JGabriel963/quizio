import type { IdGenerator } from "../application/ports/id-generator";

export class SequentialIdGenerator implements IdGenerator {
	#next = 1;

	constructor(private readonly prefix = "id") {}

	generate(): string {
		return `${this.prefix}-${this.#next++}`;
	}
}
