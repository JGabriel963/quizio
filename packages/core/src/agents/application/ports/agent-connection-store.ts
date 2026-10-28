/** A person's consent to an agent, as the OAuth server keeps it, with its last use. */
export interface AgentConnectionRecord {
	/** The consent's id. */
	id: string;
	userId: string;
	clientId: string;
	/** What the agent registered as its name, if anything. */
	clientName: string | null;
	/** The first address it registered to return to, if any. */
	redirectUri: string | null;
	connectedAt: Date;
	lastUsedAt: Date | null;
}

/**
 * The agents a person allowed (spec 044, RN-14, RN-16, RN-17). A JWT cannot be
 * revoked, so a request is only let in while its consent is still here.
 */
export interface AgentConnectionStore {
	find(userId: string, clientId: string): Promise<AgentConnectionRecord | null>;
	listFor(userId: string): Promise<AgentConnectionRecord[]>;
	/**
	 * Removes the consent with that client's tokens for the user and its last
	 * use. False when it is missing or someone else's.
	 */
	disconnect(userId: string, connectionId: string): Promise<boolean>;
	disconnectAll(userId: string): Promise<void>;
	/** Writes the last use only when the last write is older than `throttleMs`. */
	markUsed(
		userId: string,
		clientId: string,
		at: Date,
		throttleMs: number,
	): Promise<void>;
}
