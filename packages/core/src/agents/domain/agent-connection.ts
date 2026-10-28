import { webAddressParts } from "../../shared/domain/web-address";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * An agent a person allowed with Permitir (spec 044, RN-03, RN-14): the OAuth
 * consent Better Auth keeps, with the last use Quizio records.
 */
export interface AgentConnection {
	/** The consent's id. */
	id: string;
	clientId: string;
	/** Null when the agent registered no name and no return address. */
	agentName: string | null;
	connectedAt: Date;
	lastUsedAt: Date | null;
}

/**
 * The name the agent registered or, without one, the domain it returns to
 * (RN-04): anybody may register a client, so the person sees where it goes.
 */
export function agentNameOf(
	clientName: string | null,
	redirectUri: string | null,
): string | null {
	const name = clientName?.trim();
	if (name) {
		return name;
	}
	return redirectUri ? (webAddressParts(redirectUri)?.host ?? null) : null;
}

/**
 * A connection unused for more than `idleDays` stops counting (RN-18). One
 * never used counts from when it was made.
 */
export function isConnectionIdle(
	activity: { connectedAt: Date; lastUsedAt: Date | null },
	now: Date,
	idleDays: number,
): boolean {
	const lastActivity = activity.lastUsedAt ?? activity.connectedAt;
	return now.getTime() - lastActivity.getTime() > idleDays * DAY_MS;
}
