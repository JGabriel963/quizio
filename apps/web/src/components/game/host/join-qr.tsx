import { formatGamePin } from "@quizio/core/game/domain/game-pin";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogTitle,
} from "@quizio/ui/components/dialog";
import { cn } from "@quizio/ui/lib/utils";
import { XIcon } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { joinAddress, joinLink } from "@/lib/join-link";

/** The white card with the address and the PIN; larger over the expanded QR code. */
export function JoinCard({
	origin,
	pin,
	large = false,
}: {
	origin: string;
	pin: string;
	large?: boolean;
}) {
	return (
		<section
			aria-label="Como entrar"
			className="flex flex-col overflow-hidden rounded-md bg-white text-neutral-800 shadow-lg sm:flex-row"
		>
			<p
				className={cn(
					"flex items-center px-5 py-3 text-lg leading-snug",
					large && "sm:px-7 sm:text-2xl",
				)}
			>
				<span>
					Entre em <strong>{joinAddress(origin)}</strong>
				</span>
			</p>
			<div
				className={cn(
					"border-brand border-t-4 px-5 py-2 sm:border-t-0 sm:border-l-4",
					large && "sm:px-7 sm:py-3",
				)}
			>
				<p className={cn("font-bold", large && "sm:text-xl")}>PIN do jogo:</p>
				<p
					data-slot="game-pin"
					className={cn(
						"font-black text-5xl leading-none tracking-tight sm:text-7xl",
						large && "lg:text-8xl",
					)}
				>
					{formatGamePin(pin)}
				</p>
			</div>
		</section>
	);
}

/**
 * The QR code of the join link, expanded over the screen under the address
 * and the PIN, as in Kahoot: in the lobby (spec 008, RN-15) and, from the
 * header, during the game (spec 012, RN-11).
 */
export function JoinQrDialog({
	origin,
	pin,
	open,
	onOpenChange,
}: {
	origin: string;
	pin: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className="top-4 flex w-auto translate-y-0 flex-col items-center gap-6 overflow-visible bg-transparent p-0 shadow-none sm:top-6 sm:max-w-[calc(100%-2rem)]"
			>
				<DialogTitle className="sr-only">Código QR para entrar</DialogTitle>
				<JoinCard origin={origin} pin={pin} large />
				<div className="relative rounded-md bg-white p-3 shadow-lg">
					<QRCodeSVG
						value={joinLink(origin, pin)}
						size={480}
						className="size-[min(60svh,80vw)]"
						title="Código QR do link de entrada"
					/>
					<DialogClose
						aria-label="Fechar"
						className="absolute -top-4 -right-4 flex size-9 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-800 shadow-md outline-none hover:bg-neutral-100 focus-visible:ring-3 focus-visible:ring-white/60"
					>
						<XIcon aria-hidden="true" className="size-5" />
					</DialogClose>
				</div>
			</DialogContent>
		</Dialog>
	);
}
