import { formatGamePin } from "@quizio/core/game/domain/game-pin";
import { Button } from "@quizio/ui/components/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@quizio/ui/components/tooltip";
import { cn } from "@quizio/ui/lib/utils";
import {
	LockIcon,
	MaximizeIcon,
	MinimizeIcon,
	QrCodeIcon,
	SettingsIcon,
	UserIcon,
	XIcon,
} from "lucide-react";
import { useState } from "react";

import { joinAddress } from "@/lib/join-link";
import { useFullscreen } from "@/lib/use-fullscreen";

import { Wordmark } from "../game-screen";
import { JoinQrDialog } from "./join-qr";

/** How to get into a game in progress, shown in the header (spec 012, RN-11, RN-12). */
export interface HeaderJoin {
	/** The site's origin: the address shown and the link in the QR code come from it. */
	origin: string;
	pin: string;
	locked: boolean;
}

/**
 * The bar at the top of the host's screen, in the lobby and during the game:
 * leaving, the player count and full screen (spec 008, RN-21; spec 009,
 * RN-05). During the game it also tells how to get in, and in both it opens
 * the settings (spec 012, RN-01, RN-11); the podium has neither.
 */
export function GameHeader({
	playerCount,
	onExit,
	join,
	onOpenSettings,
}: {
	playerCount: number;
	/** "Sair" asks before ending the game. */
	onExit: () => void;
	/** Only during the game: the lobby shows it large, and the podium's PIN is free. */
	join?: HeaderJoin;
	/** Without it there is no gear. */
	onOpenSettings?: () => void;
}) {
	const fullscreen = useFullscreen();

	return (
		<header className="relative grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 bg-black/40 px-2">
			<div className="flex min-w-0 items-center gap-1">
				<Button variant="ghost" size="icon" aria-label="Sair" onClick={onExit}>
					<XIcon />
				</Button>
				{join && <JoinInHeader join={join} />}
			</div>
			{/* A phone has no room for the name beside the PIN. */}
			<Wordmark className={cn("text-2xl", join && "max-sm:hidden")} />
			<div className="flex items-center gap-1 justify-self-end">
				<p className="flex items-center gap-1.5 px-2 font-bold">
					<UserIcon aria-hidden="true" className="size-4" />
					<span className="sr-only">Jogadores:</span>
					<span data-slot="player-count">{playerCount}</span>
				</p>
				{onOpenSettings && (
					<Button
						variant="ghost"
						size="icon"
						aria-label="Configurações"
						onClick={onOpenSettings}
					>
						<SettingsIcon />
					</Button>
				)}
				<Button
					variant="ghost"
					size="icon"
					aria-label={fullscreen.active ? "Sair da tela cheia" : "Tela cheia"}
					onClick={fullscreen.toggle}
				>
					{fullscreen.active ? <MinimizeIcon /> : <MaximizeIcon />}
				</Button>
			</div>
		</header>
	);
}

/**
 * "Entre em {endereço}" with the PIN and the QR code, for who arrives late;
 * or the padlock, with the game locked. Narrow screens keep only the PIN.
 */
function JoinInHeader({ join }: { join: HeaderJoin }) {
	const [expanded, setExpanded] = useState(false);

	if (join.locked) {
		return (
			<section
				aria-label="Como entrar"
				className="flex min-w-0 items-center gap-2 px-2 font-bold"
			>
				<LockIcon aria-hidden="true" className="size-4 shrink-0" />
				<span className="truncate">Jogo bloqueado</span>
			</section>
		);
	}

	return (
		<>
			<Tooltip>
				<TooltipTrigger
					render={
						<Button
							variant="ghost"
							size="icon"
							aria-label="Expandir código QR"
							onClick={() => setExpanded(true)}
						/>
					}
				>
					<QrCodeIcon />
				</TooltipTrigger>
				<TooltipContent side="bottom">Expandir código QR</TooltipContent>
			</Tooltip>
			<section
				aria-label="Como entrar"
				className="flex min-w-0 items-baseline gap-2 px-1"
			>
				{/* Wide screens: the address, then the PIN, as in Kahoot. Narrower
				    ones: "PIN do jogo:" and the PIN; a phone, the PIN alone. */}
				<span className="sr-only lg:not-sr-only lg:min-w-0 lg:truncate">
					Entre em <strong>{joinAddress(join.origin)}</strong>
				</span>
				<span className="sr-only sm:not-sr-only sm:whitespace-nowrap sm:text-sm lg:sr-only">
					PIN do jogo:
				</span>
				<strong
					data-slot="game-pin"
					className="whitespace-nowrap font-black text-xl"
				>
					{formatGamePin(join.pin)}
				</strong>
			</section>
			<JoinQrDialog
				origin={join.origin}
				pin={join.pin}
				open={expanded}
				onOpenChange={setExpanded}
			/>
		</>
	);
}
