/**
 * Who a request to the MCP server acts for, and with which credential
 * (spec 044, RN-09): the agent does everything as that person.
 */
export interface AgentIdentity {
	userId: string;
	credential:
		| { kind: "connection"; connectionId: string; clientId: string }
		| { kind: "key"; keyId: string };
}
