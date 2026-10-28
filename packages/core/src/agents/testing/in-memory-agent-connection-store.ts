import type {
	AgentConnectionRecord,
	AgentConnectionStore,
} from "../application/ports/agent-connection-store";

const AT = new Date("2026-10-28T12:00:00.000Z");

/** The consents the OAuth server would keep, given by hand with `connect`. */
export class InMemoryAgentConnectionStore implements AgentConnectionStore {
	readonly #records: AgentConnectionRecord[] = [];

	connect(
		record: Partial<AgentConnectionRecord> &
			Pick<AgentConnectionRecord, "userId" | "clientId">,
	): AgentConnectionRecord {
		const connection: AgentConnectionRecord = {
			id: `consent-${this.#records.length + 1}`,
			clientName: null,
			redirectUri: null,
			connectedAt: AT,
			lastUsedAt: null,
			...record,
		};
		this.#records.push(connection);
		return { ...connection };
	}

	async find(
		userId: string,
		clientId: string,
	): Promise<AgentConnectionRecord | null> {
		const record = this.#records.find(
			(item) => item.userId === userId && item.clientId === clientId,
		);
		return record ? { ...record } : null;
	}

	/** Newest connection first, as the database lists them. */
	async listFor(userId: string): Promise<AgentConnectionRecord[]> {
		return this.#records
			.filter((record) => record.userId === userId)
			.sort((a, b) => b.connectedAt.getTime() - a.connectedAt.getTime())
			.map((record) => ({ ...record }));
	}

	async disconnect(userId: string, connectionId: string): Promise<boolean> {
		const index = this.#records.findIndex(
			(record) => record.id === connectionId && record.userId === userId,
		);
		if (index === -1) {
			return false;
		}
		this.#records.splice(index, 1);
		return true;
	}

	async disconnectAll(userId: string): Promise<void> {
		for (let index = this.#records.length - 1; index >= 0; index--) {
			if (this.#records[index]?.userId === userId) {
				this.#records.splice(index, 1);
			}
		}
	}

	async markUsed(
		userId: string,
		clientId: string,
		at: Date,
		throttleMs: number,
	): Promise<void> {
		const record = this.#records.find(
			(item) => item.userId === userId && item.clientId === clientId,
		);
		if (
			record &&
			(record.lastUsedAt === null ||
				at.getTime() - record.lastUsedAt.getTime() >= throttleMs)
		) {
			record.lastUsedAt = at;
		}
	}
}
