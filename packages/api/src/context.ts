import { auth } from "@quizio/auth";

import { getContainer } from "./composition-root";
import type { Container } from "./container";

export interface Context {
	session: Awaited<ReturnType<typeof auth.api.getSession>>;
	container: Container;
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
	};
}
