import { formatGamePin } from "@quizio/core/game/domain/game-pin";
import { AnswerShape, answerShapeAt } from "@quizio/ui/components/answer-shape";
import { Badge } from "@quizio/ui/components/badge";
import { Button } from "@quizio/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@quizio/ui/components/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@quizio/ui/components/dropdown-menu";
import { Link } from "@tanstack/react-router";
import {
	CopyIcon,
	InfoIcon,
	Link2Icon,
	MailIcon,
	ShareIcon,
	UserPlusIcon,
	UserRoundIcon,
	UsersRoundIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { assignmentLink, assignmentShareMessage } from "@/lib/assignment-link";
import { joinAddress } from "@/lib/join-link";
import { shareTargets } from "@/lib/share-targets";
import { timeUntil } from "@/lib/time-until";

/** What the dialog shares (spec 029, RN-21). */
export interface ShareableAssignment {
	gameId: string;
	name: string;
	pin: string;
	/** ISO string, as the API sends it. */
	deadline: string;
	remainingMs: number;
	participantCount: number;
}

/** "Link copiado" / "PIN copiado" for a moment after a copy. */
function useCopied() {
	const [copied, setCopied] = useState<string | null>(null);
	useEffect(() => {
		if (!copied) {
			return;
		}
		const timer = setTimeout(() => setCopied(null), 3000);
		return () => clearTimeout(timer);
	}, [copied]);
	return {
		copied,
		copy: (text: string, message: string) =>
			navigator.clipboard.writeText(text).then(
				() => setCopied(message),
				() => setCopied("Não foi possível copiar."),
			),
	};
}

/**
 * "Compartilhe com os participantes" (spec 029, RN-21 to RN-25): the link, the
 * PIN and the networks. Groups and e-mail are "Em breve", without any plan.
 */
export function ShareAssignmentDialog({
	open,
	onOpenChange,
	origin,
	assignment,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	origin: string;
	assignment: ShareableAssignment;
}) {
	const link = assignmentLink(origin, assignment.gameId);
	const message = assignmentShareMessage({
		name: assignment.name,
		deadline: assignment.deadline,
		link,
	});
	const { copied, copy } = useCopied();
	const canShare = typeof navigator !== "undefined" && "share" in navigator;

	return (
		<Dialog open={open} onOpenChange={(next) => onOpenChange(next)}>
			<DialogContent className="sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>Compartilhe com os participantes</DialogTitle>
				</DialogHeader>

				<div
					aria-hidden="true"
					className="flex h-28 items-center justify-center rounded-md bg-linear-to-r from-sky-100 via-white to-violet-200"
				>
					<div className="grid grid-cols-2 gap-1 rounded-xl bg-brand p-2 shadow-lg">
						{[0, 1, 2, 3].map((index) => {
							const shape = answerShapeAt(index);
							return (
								<span
									key={shape}
									data-shape={shape}
									className="flex size-8 items-center justify-center rounded-sm text-white data-[shape=circle]:bg-answer-yellow data-[shape=diamond]:bg-answer-blue data-[shape=square]:bg-answer-green data-[shape=triangle]:bg-answer-red"
								>
									<AnswerShape shape={shape} className="size-4" />
								</span>
							);
						})}
					</div>
				</div>

				<DialogDescription>
					Envie o link, mostre o código QR ou compartilhe o PIN abaixo.
					Acompanhe o progresso a qualquer momento no relatório.
				</DialogDescription>

				<Link
					to="/reports/$gameId"
					params={{ gameId: assignment.gameId }}
					className="flex items-center gap-3 rounded-md border bg-muted/40 px-4 py-3 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
				>
					<span
						aria-hidden="true"
						className="size-2.5 rounded-full bg-primary"
					/>
					<span className="min-w-0 flex-1">
						<span className="block truncate font-bold">{assignment.name}</span>
						<span className="block text-muted-foreground text-sm">
							Termina: {timeUntil(assignment.remainingMs)}
						</span>
					</span>
					<span className="flex items-center gap-1 text-sm">
						<UserRoundIcon aria-hidden="true" className="size-4" />
						<span className="sr-only">Participantes: </span>
						{assignment.participantCount}
					</span>
				</Link>

				<div className="flex flex-col items-center gap-3 border-t pt-4">
					<div className="flex flex-wrap justify-center gap-2">
						{canShare ? (
							<Button
								variant="secondary"
								onClick={() => {
									navigator
										.share({ title: assignment.name, text: message, url: link })
										.catch(() => {
											// Closing the share sheet is not a failure.
										});
								}}
							>
								<ShareIcon data-icon="inline-start" />
								Compartilhar
							</Button>
						) : (
							<DropdownMenu>
								<DropdownMenuTrigger render={<Button variant="secondary" />}>
									<ShareIcon data-icon="inline-start" />
									Compartilhar
								</DropdownMenuTrigger>
								<DropdownMenuContent align="center">
									{shareTargets({
										message,
										link,
										subject: assignment.name,
									}).map((target) => (
										<DropdownMenuItem
											key={target.name}
											render={
												<a
													href={target.href}
													target="_blank"
													rel="noreferrer"
												/>
											}
										>
											{target.name}
										</DropdownMenuItem>
									))}
									<DropdownMenuItem onClick={() => copy(link, "Link copiado")}>
										Copiar link
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						)}
						<DropdownMenu>
							<DropdownMenuTrigger render={<Button variant="secondary" />}>
								<UserPlusIcon data-icon="inline-start" />
								Adicionar participantes
							</DropdownMenuTrigger>
							<DropdownMenuContent align="center">
								<DropdownMenuItem disabled>
									<UsersRoundIcon aria-hidden="true" />
									Atribuir a grupos
									<Badge variant="soon">Em breve</Badge>
								</DropdownMenuItem>
								<DropdownMenuItem disabled>
									<MailIcon aria-hidden="true" />
									Atribuir por e-mail
									<Badge variant="soon">Em breve</Badge>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
					<Button onClick={() => copy(link, "Link copiado")}>
						<Link2Icon data-icon="inline-start" />
						Copiar link
					</Button>
					<p className="flex flex-wrap items-center justify-center gap-1.5 text-lg">
						Ou entre com o PIN:{" "}
						<strong className="font-black">
							{formatGamePin(assignment.pin)}
						</strong>
						<Button
							variant="ghost"
							size="icon-sm"
							aria-label="Copiar PIN"
							onClick={() => copy(assignment.pin, "PIN copiado")}
						>
							<CopyIcon />
						</Button>
						<span
							role="img"
							aria-label={`Os participantes digitam o PIN em ${joinAddress(origin)}`}
							title={`Os participantes digitam o PIN em ${joinAddress(origin)}`}
						>
							<InfoIcon
								aria-hidden="true"
								className="size-4 text-muted-foreground"
							/>
						</span>
					</p>
					<p
						aria-live="polite"
						className="min-h-5 text-muted-foreground text-sm"
					>
						{copied ?? ""}
					</p>
				</div>
			</DialogContent>
		</Dialog>
	);
}
