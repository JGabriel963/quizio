import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@quizio/ui/components/tooltip";
import { cn } from "@quizio/ui/lib/utils";
import { ExpandIcon, LockIcon } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";

import { joinLink } from "@/lib/join-link";

import { JoinCard, JoinQrDialog } from "./join-qr";

/**
 * How to get in: the address, the PIN and the QR code; or, with the padlock
 * closed, that nobody else gets in (spec 008, RN-14 to RN-16, RN-26).
 */
export function JoinInstructions({
	origin,
	pin,
	locked,
}: {
	/** The site's origin: the address shown and the link in the QR code come from it. */
	origin: string;
	pin: string;
	locked: boolean;
}) {
	if (locked) {
		return (
			<section
				aria-label="Como entrar"
				className="flex items-center gap-3 rounded-md bg-white px-6 py-5 font-bold text-neutral-800 text-xl shadow-lg sm:text-2xl"
			>
				<LockIcon aria-hidden="true" className="size-8 shrink-0" />
				Jogo bloqueado: ninguém mais pode entrar
			</section>
		);
	}

	return <OpenInstructions origin={origin} pin={pin} />;
}

function OpenInstructions({ origin, pin }: { origin: string; pin: string }) {
	const [expanded, setExpanded] = useState(false);

	return (
		// With the QR code expanded, the card shows above it, larger: this one
		// steps aside instead of showing twice.
		<div
			className={cn(
				"flex flex-col items-center gap-2",
				expanded && "invisible",
			)}
		>
			<div className="flex flex-wrap items-stretch justify-center gap-3">
				<JoinCard origin={origin} pin={pin} />
				<QrCode
					origin={origin}
					pin={pin}
					expanded={expanded}
					onExpandedChange={setExpanded}
				/>
			</div>
			<CopyJoinLink link={joinLink(origin, pin)} />
		</div>
	);
}

/**
 * The QR code of the join link. Hovering or focusing it offers to expand; the
 * expanded one covers the lobby, under the address and the PIN, as in Kahoot
 * (spec 008, RN-15).
 */
function QrCode({
	origin,
	pin,
	expanded,
	onExpandedChange,
}: {
	origin: string;
	pin: string;
	expanded: boolean;
	onExpandedChange: (expanded: boolean) => void;
}) {
	const link = joinLink(origin, pin);

	return (
		<>
			<Tooltip>
				<TooltipTrigger
					render={
						<button
							type="button"
							aria-label="Expandir código QR"
							onClick={() => onExpandedChange(true)}
							className="group relative rounded-md bg-white p-1.5 shadow-lg outline-none focus-visible:ring-3 focus-visible:ring-white/60"
						/>
					}
				>
					<QRCodeSVG
						value={link}
						size={96}
						aria-hidden="true"
						className="transition-opacity group-hover:opacity-25 group-focus-visible:opacity-25"
					/>
					<span
						aria-hidden="true"
						className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
					>
						<span className="flex size-11 items-center justify-center rounded-full bg-neutral-800 text-white">
							<ExpandIcon className="size-5" />
						</span>
					</span>
				</TooltipTrigger>
				<TooltipContent side="bottom">Expandir código QR</TooltipContent>
			</Tooltip>
			<JoinQrDialog
				origin={origin}
				pin={pin}
				open={expanded}
				onOpenChange={onExpandedChange}
			/>
		</>
	);
}

function CopyJoinLink({ link }: { link: string }) {
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (!copied) {
			return;
		}
		const timer = setTimeout(() => setCopied(false), 2500);
		return () => clearTimeout(timer);
	}, [copied]);

	return (
		<p className="flex min-h-6 items-center gap-3 text-sm">
			<button
				type="button"
				onClick={() => {
					navigator.clipboard.writeText(link).then(
						() => setCopied(true),
						// Clipboard refused (no permission, insecure context): nothing to confirm.
						() => {},
					);
				}}
				className="rounded font-semibold underline underline-offset-4 outline-none hover:no-underline focus-visible:ring-3 focus-visible:ring-white/60"
			>
				Copiar link para compartilhar
			</button>
			<span role="status" className="font-bold">
				{copied ? "Link copiado" : ""}
			</span>
		</p>
	);
}
