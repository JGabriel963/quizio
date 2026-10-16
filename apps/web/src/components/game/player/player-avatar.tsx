import { PencilIcon } from "lucide-react";

import { Avatar } from "../avatar";
import { usePlayerAvatar } from "./player-avatar-context";
import { Centered, PlayerFrame } from "./player-frame";

/** The avatar large in a card, with the pencil while it may change (RN-10). */
export function AvatarCard() {
	const { avatar, onEdit } = usePlayerAvatar();
	if (!avatar) {
		return null;
	}
	return (
		<div
			data-testid="avatar-card"
			className="relative rounded-lg bg-black/25 p-4 shadow-lg"
		>
			<Avatar avatar={avatar} animateOnChange className="size-36 sm:size-44" />
			{onEdit && (
				<button
					type="button"
					aria-label="Editar avatar"
					onClick={onEdit}
					className="absolute -top-3 -right-3 flex size-9 cursor-pointer items-center justify-center rounded-full bg-white text-neutral-900 shadow-md transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
				>
					<PencilIcon aria-hidden="true" className="size-4" />
				</button>
			)}
		</div>
	);
}

/**
 * The waiting screen with the characters on (spec 008, RN-43; spec 028,
 * RN-10): the avatar card above the nickname, and the footer.
 */
export function AvatarWaitingScreen({ nickname }: { nickname: string }) {
	return (
		<PlayerFrame nickname={nickname} total={null}>
			<Centered>
				<AvatarCard />
				<h1 className="break-all font-black text-4xl sm:text-5xl">
					{nickname}
				</h1>
				<p className="font-bold text-lg">
					Pronto! Está vendo seu apelido na tela?
				</p>
			</Centered>
		</PlayerFrame>
	);
}
