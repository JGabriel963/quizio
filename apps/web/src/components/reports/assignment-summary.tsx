import { formatGamePin } from "@quizio/core/game/domain/game-pin";
import { Button, buttonVariants } from "@quizio/ui/components/button";
import { PlayIcon } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { assignmentLink } from "@/lib/assignment-link";

const card = "rounded-lg bg-card shadow-sm ring-1 ring-foreground/5";

/** "Capitais — Turma A" → "capitais-turma-a". */
function fileNameOf(name: string): string {
	const slug = name
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
	return `qr-${slug || "atividade"}.png`;
}

/**
 * The top of an open assignment's summary (spec 029, RN-32, RN-33): who is
 * in, the ways to invite more, and the controls of the deadline.
 */
export function AssignmentSummary({
	gameId,
	name,
	participantCount,
	assignment,
	origin,
	onShare,
	onChangeDeadline,
	onEnd,
}: {
	gameId: string;
	name: string;
	participantCount: number;
	assignment: { pin: string | null };
	origin: string;
	onShare: () => void;
	onChangeDeadline: () => void;
	onEnd: () => void;
}) {
	const link = assignmentLink(origin, gameId);
	const qr = useRef<HTMLCanvasElement>(null);
	const [copied, setCopied] = useState<string | null>(null);

	useEffect(() => {
		if (!copied) {
			return;
		}
		const timer = setTimeout(() => setCopied(null), 3000);
		return () => clearTimeout(timer);
	}, [copied]);

	const copy = (text: string, message: string) =>
		navigator.clipboard.writeText(text).then(
			() => setCopied(message),
			() => setCopied("Não foi possível copiar."),
		);

	function download() {
		const url = qr.current?.toDataURL("image/png");
		if (!url) {
			return;
		}
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = fileNameOf(name);
		anchor.click();
	}

	return (
		<>
			<section
				aria-label="Convidar participantes"
				className={`${card} grid min-w-0 grid-cols-1 gap-5 p-5 sm:grid-cols-[auto_minmax(0,1fr)] lg:col-span-2 2xl:grid-cols-[auto_minmax(0,1fr)_18rem]`}
			>
				<div className="flex size-36 flex-col items-center justify-center self-center justify-self-center rounded-full border-8 border-primary">
					<span className="font-black text-4xl tabular-nums">
						{participantCount}
					</span>
					<span className="font-semibold text-sm">
						{participantCount === 1 ? "participante" : "participantes"}
					</span>
				</div>
				<div className="flex min-w-0 flex-col items-start gap-3">
					<h2 className="font-black text-2xl">Convide mais participantes!</h2>
					<p className="text-muted-foreground">
						Convide participantes compartilhando a URL ou o PIN. Eles podem
						participar deste quiz até o prazo estipulado.
					</p>
					<Button onClick={onShare}>Compartilhar atividade atribuída</Button>
				</div>
				{/* Beside the text only on a very wide screen; under it otherwise. */}
				<div className="flex min-w-0 flex-col gap-2 sm:col-span-2 2xl:col-span-1">
					<Fact
						label={
							<span className="flex items-center gap-3">
								<QRCodeCanvas
									ref={qr}
									value={link}
									size={96}
									marginSize={1}
									role="img"
									aria-label="Código QR da atividade"
								/>
								Código QR
							</span>
						}
						action={
							<Button variant="secondary" size="sm" onClick={download}>
								Baixar
							</Button>
						}
					/>
					{assignment.pin && (
						<Fact
							label={
								<>
									<span className="block text-muted-foreground text-sm">
										PIN do jogo
									</span>
									<strong>{formatGamePin(assignment.pin)}</strong>
								</>
							}
							action={
								<Button
									variant="secondary"
									size="sm"
									aria-label="Copiar PIN do jogo"
									onClick={() => copy(assignment.pin ?? "", "PIN copiado")}
								>
									Copiar
								</Button>
							}
						/>
					)}
					<Fact
						label={
							<>
								<span className="block text-muted-foreground text-sm">URL</span>
								<strong className="block truncate">{link}</strong>
							</>
						}
						action={
							<Button
								variant="secondary"
								size="sm"
								aria-label="Copiar URL"
								onClick={() => copy(link, "URL copiada")}
							>
								Copiar
							</Button>
						}
					/>
					<p
						aria-live="polite"
						className="min-h-5 text-muted-foreground text-sm"
					>
						{copied ?? ""}
					</p>
				</div>
			</section>

			<div className="flex min-w-0 flex-col gap-4">
				<section
					aria-label="Prazo da atribuição"
					className="flex flex-wrap items-center justify-center gap-2 rounded-lg bg-primary/10 p-5"
				>
					<Button onClick={onChangeDeadline}>Alterar prazo</Button>
					<Button variant="secondary" onClick={onEnd}>
						Encerrar agora
					</Button>
				</section>
				<section
					aria-label="Jogue este quiz"
					className="flex flex-wrap items-center justify-center gap-3 rounded-lg bg-success/10 p-5"
				>
					{/* The creator plays as anybody else (spec 030, RN-29). */}
					<a
						href={link}
						target="_blank"
						rel="noopener noreferrer"
						className={buttonVariants({ variant: "success" })}
					>
						<PlayIcon data-icon="inline-start" />
						Jogue este quiz
					</a>
				</section>
			</div>
		</>
	);
}

function Fact({ label, action }: { label: ReactNode; action: ReactNode }) {
	return (
		<div className="flex items-center justify-between gap-3 rounded-md border p-3">
			<div className="min-w-0">{label}</div>
			{action}
		</div>
	);
}
