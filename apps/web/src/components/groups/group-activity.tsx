import {
	MessageCircleIcon,
	NewspaperIcon,
	ShareIcon,
	SquareCheckBigIcon,
} from "lucide-react";
import { type ReactNode, useId } from "react";

import type { GroupViewData } from "@/lib/api-types";

import { ComingSoonAction } from "./coming-soon-action";
import { GroupSetupCard } from "./group-setup-card";

/**
 * The Atividade tab (spec 034, RN-15, RN-17; spec 038): the composer, with
 * Atribuir for who may assign; the admin's setup card; and the feed, or the
 * empty state without posts. Text posts and sharing come with specs 036 and
 * 037.
 */
export function GroupActivity({
	isAdmin,
	canAssign,
	setup,
	feed,
	onInvite,
	onAssign,
	onDismissSetup,
}: {
	isAdmin: boolean;
	/** The admin, or members when the admin lets them (spec 038, RN-01). */
	canAssign: boolean;
	setup: GroupViewData["setup"];
	/** The feed; null without posts. */
	feed: ReactNode | null;
	onInvite: () => void;
	onAssign: () => void;
	onDismissSetup: () => void;
}) {
	const composerId = useId();

	return (
		<div className="flex flex-col gap-4">
			<section
				aria-labelledby={composerId}
				className="flex flex-col gap-3 rounded-lg bg-card p-4 shadow-sm"
			>
				<h2 id={composerId} className="sr-only">
					Publicar algo
				</h2>
				<div
					aria-hidden="true"
					className="rounded-md border border-border px-4 py-2.5 text-muted-foreground"
				>
					Publicar algo
				</div>
				<div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
					<ComingSoonAction
						label="Criar publicação"
						icon={<MessageCircleIcon />}
						showBadge={false}
					/>
					<ComingSoonAction
						label="Compart."
						icon={<ShareIcon />}
						showBadge={false}
					/>
					{canAssign && (
						<button
							type="button"
							onClick={onAssign}
							className="inline-flex items-center gap-1.5 text-sm hover:text-primary [&>svg]:size-4 [&>svg]:text-primary"
						>
							<SquareCheckBigIcon aria-hidden="true" />
							Atribuir
						</button>
					)}
				</div>
				<p className="text-center text-muted-foreground text-xs">
					Publicações e compartilhamento chegam em breve.
				</p>
			</section>

			{isAdmin && setup && (
				<GroupSetupCard
					setup={setup}
					onInvite={onInvite}
					onAssign={onAssign}
					onDismiss={onDismissSetup}
				/>
			)}

			{feed ?? (
				<div className="flex flex-col items-center gap-4 rounded-lg border-2 border-border border-dashed px-6 py-16 text-center">
					<NewspaperIcon
						aria-hidden="true"
						className="size-10 text-muted-foreground"
					/>
					<p className="max-w-md text-sm">
						Ainda não há nenhuma atividade neste grupo. Faça uma publicação para
						começar.
					</p>
					<ComingSoonAction label="Criar publicação" />
				</div>
			)}
		</div>
	);
}

/** Compartilhado, until spec 037 (RN-14). */
export function GroupComingSoon({ title }: { title: string }) {
	return (
		<div className="flex flex-col items-center gap-3 rounded-lg border-2 border-border border-dashed px-6 py-16 text-center">
			<p className="font-semibold">{title}</p>
			<p className="text-muted-foreground text-sm">Em breve.</p>
		</div>
	);
}
