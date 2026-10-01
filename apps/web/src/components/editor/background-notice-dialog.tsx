import { Button } from "@quizio/ui/components/button";
import { Checkbox } from "@quizio/ui/components/checkbox";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@quizio/ui/components/dialog";
import { Label } from "@quizio/ui/components/label";
import { cn } from "@quizio/ui/lib/utils";
import { useId, useState } from "react";

/**
 * Shown when an image becomes the background (spec 007, RN-25): the game
 * covers parts of it. It only informs; the image is already the background.
 */
export function BackgroundNoticeDialog({
	open,
	imageUrl,
	onClose,
}: {
	open: boolean;
	imageUrl: string | null;
	/** `dismissForever`: "Não mostrar essa mensagem novamente" was checked (RN-26). */
	onClose: (dismissForever: boolean) => void;
}) {
	const checkboxId = useId();
	const [dismiss, setDismiss] = useState(false);

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) {
					onClose(dismiss);
				}
			}}
		>
			<DialogContent showCloseButton={false} className="sm:max-w-xl">
				<DialogHeader className="pr-0">
					<DialogTitle className="text-2xl">
						Partes do fundo não ficarão visíveis durante o jogo
					</DialogTitle>
				</DialogHeader>

				<ul className="flex list-disc flex-col gap-1 pl-6 text-base">
					<li>
						Elementos do jogo (como caixas de perguntas e respostas) irão
						obstruir partes do fundo
					</li>
					<li>Alguns dispositivos irão esconder partes do fundo.</li>
				</ul>

				<div
					aria-hidden="true"
					className="flex items-end justify-center gap-4 sm:gap-6"
				>
					<DevicePreview
						label="Dispositivo móvel"
						imageUrl={imageUrl}
						className="aspect-[2/3] w-24"
					/>
					<DevicePreview
						label="Computador (desktop)"
						imageUrl={imageUrl}
						className="aspect-[7/4] w-52"
					/>
				</div>

				<div className="flex items-center gap-2">
					<Checkbox
						id={checkboxId}
						checked={dismiss}
						onCheckedChange={(checked) => setDismiss(checked === true)}
					/>
					<Label htmlFor={checkboxId}>
						Não mostrar essa mensagem novamente
					</Label>
				</div>

				<DialogFooter className="sm:justify-center">
					<Button onClick={() => onClose(dismiss)}>Ok</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

/** A tiny game screen over the image: the question box on top, the answers below. */
function DevicePreview({
	label,
	imageUrl,
	className,
}: {
	label: string;
	imageUrl: string | null;
	className: string;
}) {
	return (
		<figure className="flex flex-col items-center gap-2">
			<div
				className={cn(
					"relative flex flex-col justify-between overflow-hidden rounded-sm bg-brand bg-center bg-cover p-2 shadow-md",
					className,
				)}
				style={imageUrl ? { backgroundImage: `url("${imageUrl}")` } : undefined}
			>
				<span className="mx-auto h-3 w-4/5 bg-card" />
				<span className="grid grid-cols-2 gap-0.5">
					<span className="h-4 bg-answer-red" />
					<span className="h-4 bg-answer-blue" />
					<span className="h-4 bg-answer-yellow" />
					<span className="h-4 bg-answer-green" />
				</span>
			</div>
			<figcaption className="text-sm">{label}</figcaption>
		</figure>
	);
}
