import { auth } from "@quizio/auth";

import { clientIpOf } from "./client-ip";
import { getContainer } from "./composition-root";
import type { Container } from "./container";

export interface Context {
	session: Awaited<ReturnType<typeof auth.api.getSession>>;
	container: Container;
	/** The caller's network address; keys the limit on wrong game PINs. */
	clientIp: string;
}

export async function createContext({
	req,
}: {
	req: Request;
}): Promise<Context> {
	const session = await auth.api.getSession({
		headers: req.headers,
	});
	return {
		session,
		container: getContainer(),
		clientIp: clientIpOf(req.headers),
	};
}
