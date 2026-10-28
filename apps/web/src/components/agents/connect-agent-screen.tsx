import { Button } from "@quizio/ui/components/button";
import { Link } from "@tanstack/react-router";
import {
	BellIcon,
	ChartColumnIcon,
	CircleCheckIcon,
	GamepadIcon,
	PencilIcon,
	ShieldOffIcon,
	UsersIcon,
} from "lucide-react";
import { type ReactNode, useState } from "react";

import { UserAvatar } from "@/components/account/user-avatar";

export type ConnectAgentState =
	| {
			kind: "ready";
			agentName: string;
			/** Where the person goes back to (RN-03): anybody may register an agent. */
			returnDomain: string | null;
			account: {
				userId: string;
				name: string;
				email: string;
				photoUrl: string | null;
			};
	  }
	| { kind: "invalid" };

const MAY: { icon: ReactNode; text: string }[] = [
	{
		icon: <PencilIcon aria-hidden />,
		text: "Criar, editar, publicar e excluir seus quizzes e temas",
	},
	{
		icon: <GamepadIcon aria-hidden />,
		text: "Organizar partidas ao vivo e atribuições",
	},
	{
		icon: <ChartColumnIcon aria-hidden />,
		text: "Ler, renomear e excluir seus relatórios",
	},
	{
		icon: <UsersIcon aria-hidden />,
		text: "Gerenciar seus grupos, membros e publicações",
	},
	{ icon: <BellIcon aria-hidden />, text: "Ler suas notificações" },
];

/**
 * "Conectar ao Quizio" (spec 044, RN-03, RN-04): the person sees which agent
 * asks, for which account, what it may do and where it goes back to, and
 * answers with Permitir or Cancelar. The route wires the actions.
 */
export function ConnectAgentScreen({
	state,
	onAllow,
	onCancel,
	onSwitchAccount,
}: {
	state: ConnectAgentState;
	onAllow: () => Promise<void>;
	onCancel: () => Promise<void>;
	onSwitchAccount: () => Promise<void>;
}) {
	const [busy, setBusy] = useState(false);

	if (state.kind === "invalid") {
		return (
			<div className="flex flex-col items-start gap-4">
				<h1 className="font-bold text-xl">
					Este pedido de conexão não é válido.
				</h1>
				<Button render={<Link to="/" />} nativeButton={false}>
					Ir para o início
				</Button>
			</div>
		);
	}

	const act = (action: () => Promise<void>) => async () => {
		setBusy(true);
		try {
			await action();
		} finally {
			setBusy(false);
		}
	};
	const { agentName, returnDomain, account } = state;

	return (
		<div className="flex flex-col gap-5">
			<h1 className="font-bold text-xl leading-snug">
				{agentName} quer acessar sua conta do Quizio
			</h1>
			<div className="flex items-center gap-3 rounded-md border p-3">
				<UserAvatar userId={account.userId} photoUrl={account.photoUrl} />
				<div className="flex min-w-0 flex-1 flex-col">
					<span className="truncate font-semibold">{account.name}</span>
					<span className="truncate text-muted-foreground text-sm">
						{account.email}
					</span>
				</div>
				<Button
					type="button"
					variant="link"
					className="shrink-0 px-0"
					disabled={busy}
					onClick={act(onSwitchAccount)}
				>
					Usar outra conta
				</Button>
			</div>
			<div className="flex flex-col gap-2">
				<p className="font-semibold">O agente poderá:</p>
				<ul className="flex flex-col gap-2">
					{MAY.map(({ icon, text }) => (
						<li
							key={text}
							className="flex items-start gap-2 [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-success"
						>
							{icon}
							<span>{text}</span>
						</li>
					))}
				</ul>
				<p className="flex items-start gap-2 text-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0">
					<ShieldOffIcon aria-hidden />
					<span>
						O agente não poderá excluir sua conta nem trocar sua senha.
					</span>
				</p>
			</div>
			{returnDomain && (
				<p className="flex items-start gap-2 text-muted-foreground text-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0">
					<CircleCheckIcon aria-hidden />
					<span>Depois, você volta para {returnDomain}.</span>
				</p>
			)}
			<div className="flex flex-wrap justify-end gap-3">
				<Button
					type="button"
					variant="outline"
					disabled={busy}
					onClick={act(onCancel)}
				>
					Cancelar
				</Button>
				<Button
					type="button"
					variant="success"
					disabled={busy}
					onClick={act(onAllow)}
				>
					Permitir
				</Button>
			</div>
		</div>
	);
}
