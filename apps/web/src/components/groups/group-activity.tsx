import { Button } from "@quizio/ui/components/button";
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
 * The Atividade tab (spec 034, RN-15, RN-17; specs 036 and 038): the
 * composer, whose "Publicar algo" and Criar publicação open "Criar
 * publicação", with Atribuir for who may assign; the admin's setup card; and
 * the feed, or the empty state without posts. Compart. comes with spec 037.
 */
export function GroupActivity({
	isAdmin,
	canAssign,
	setup,
	feed,
	onInvite,
	onAssign,
	onCreatePost,
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
	onCreatePost: () => void;
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
				<button
					type="button"
					onClick={onCreatePost}
					className="rounded-md border border-border px-4 py-2.5 text-left text-muted-foreground transition-colors hover:bg-muted/50"
				>
					Publicar algo
				</button>
				<div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
					<button
						type="button"
						onClick={onCreatePost}
						className="inline-flex items-center gap-1.5 text-sm hover:text-primary [&>svg]:size-4 [&>svg]:text-primary"
					>
						<MessageCircleIcon aria-hidden="true" />
						Criar publicação
					</button>
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
			</section>

			{isAdmin && setup && (
				<GroupSetupCard
					setup={setup}
					onInvite={onInvite}
					onAssign={onAssign}
					onCreatePost={onCreatePost}
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
					<Button onClick={onCreatePost}>Criar publicação</Button>
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
