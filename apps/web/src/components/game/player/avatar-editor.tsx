import type { Avatar as AvatarValue } from "@quizio/core/game/domain/avatar";
import { Button } from "@quizio/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogTitle,
} from "@quizio/ui/components/dialog";
import { cn } from "@quizio/ui/lib/utils";
import { BanIcon } from "lucide-react";
import { type ReactNode, useId, useState } from "react";

import { AVATAR_CATALOG, NEUTRAL_HEAD_SRC } from "@/lib/avatar-catalog";

import { Avatar, accessoryStyle } from "../avatar";

type Tab = "character" | "accessory";

/**
 * The avatar editor of the waiting screens (spec 027, RN-11 to RN-14): the
 * avatar on top, the "Personagem" and "Acessório" tabs and a grid. A tap
 * changes the avatar at once, before the server answers; if the server
 * refuses or cannot be reached, the editor goes back to the avatar it had
 * and says so. "Pronto" only closes it.
 */
export function AvatarEditor({
	open,
	avatar,
	onChange,
	onClose,
}: {
	open: boolean;
	/** The avatar as the server has it. */
	avatar: AvatarValue;
	/** Rejects when the change was not saved. */
	onChange: (avatar: AvatarValue) => Promise<void>;
	onClose: () => void;
}) {
	const [tab, setTab] = useState<Tab>("character");
	/** The last tap: what the player sees, unless it failed. */
	const [pending, setPending] = useState<AvatarValue | null>(null);
	const [failed, setFailed] = useState(false);
	const shown = pending ?? avatar;
	const tabsId = useId();

	function choose(next: AvatarValue) {
		setPending(next);
		setFailed(false);
		onChange(next).catch(() => {
			// Only the last tap goes back: a later one is still on its way.
			setPending((current) => (current === next ? null : current));
			setFailed(true);
		});
	}

	return (
		<Dialog open={open} onOpenChange={(next) => !next && onClose()}>
			<DialogContent
				showCloseButton={false}
				className="flex max-h-[calc(100svh-16rem)] flex-col gap-0 overflow-visible p-0 sm:max-w-2xl"
			>
				<div
					data-testid="avatar-preview"
					className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2"
				>
					<Avatar avatar={shown} animateOnChange className="size-28" />
				</div>
				<DialogTitle className="sr-only">Editar avatar</DialogTitle>
				<div
					role="tablist"
					aria-label="Editar avatar"
					className="mx-auto mt-3 mb-2 grid w-64 grid-cols-2 rounded-md border bg-muted p-0.5"
				>
					<TabButton
						id={`${tabsId}-character`}
						panel={`${tabsId}-panel`}
						selected={tab === "character"}
						onSelect={() => setTab("character")}
					>
						Personagem
					</TabButton>
					<TabButton
						id={`${tabsId}-accessory`}
						panel={`${tabsId}-panel`}
						selected={tab === "accessory"}
						onSelect={() => setTab("accessory")}
					>
						Acessório
					</TabButton>
				</div>
				{/* The grid scrolls in a box of its own: squeezed, its rows would overlap. */}
				<div className="min-h-0 flex-1 overflow-y-auto border-y">
					<div
						role="tabpanel"
						id={`${tabsId}-panel`}
						aria-labelledby={`${tabsId}-${tab}`}
						className="grid grid-cols-4 gap-2 p-3 sm:grid-cols-5"
					>
						{tab === "character"
							? AVATAR_CATALOG.characters.map((item) => (
									<GridItem
										key={item.id}
										label={item.label}
										pressed={shown.character === item.id}
										onPress={() => choose({ ...shown, character: item.id })}
									>
										<img
											src={item.src}
											alt=""
											loading="lazy"
											className="size-4/5"
										/>
									</GridItem>
								))
							: [
									<GridItem
										key="none"
										label="Nenhum"
										pressed={shown.accessory === null}
										onPress={() => choose({ ...shown, accessory: null })}
									>
										<BanIcon
											aria-hidden="true"
											className="size-1/2 text-muted-foreground"
										/>
									</GridItem>,
									...AVATAR_CATALOG.accessories.map((item) => (
										<GridItem
											key={item.id}
											label={item.label}
											pressed={shown.accessory === item.id}
											onPress={() => choose({ ...shown, accessory: item.id })}
										>
											<span className="relative block size-full">
												<img
													src={NEUTRAL_HEAD_SRC}
													alt=""
													className="absolute"
													style={{
														left: "12%",
														top: "18%",
														width: "76%",
														height: "76%",
													}}
												/>
												<img
													src={item.src}
													alt=""
													loading="lazy"
													className="absolute"
													style={accessoryStyle(item)}
												/>
											</span>
										</GridItem>
									)),
								]}
					</div>
				</div>
				{failed && (
					<p
						role="alert"
						className="px-4 pt-3 text-center font-semibold text-destructive text-sm"
					>
						Não foi possível trocar o avatar.
					</p>
				)}
				<Button variant="ghost" className="m-2 font-bold" onClick={onClose}>
					Pronto
				</Button>
			</DialogContent>
		</Dialog>
	);
}

function TabButton({
	id,
	panel,
	selected,
	onSelect,
	children,
}: {
	id: string;
	panel: string;
	selected: boolean;
	onSelect: () => void;
	children: ReactNode;
}) {
	return (
		<button
			type="button"
			role="tab"
			id={id}
			aria-selected={selected}
			aria-controls={panel}
			onClick={onSelect}
			className={cn(
				"cursor-pointer rounded px-3 py-1.5 font-semibold text-sm",
				selected ? "bg-card shadow-sm" : "text-muted-foreground",
			)}
		>
			{children}
		</button>
	);
}

function GridItem({
	label,
	pressed,
	onPress,
	children,
}: {
	label: string;
	pressed: boolean;
	onPress: () => void;
	children: ReactNode;
}) {
	return (
		<button
			type="button"
			aria-label={label}
			aria-pressed={pressed}
			onClick={onPress}
			className={cn(
				"flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-md border-2 bg-muted transition-colors hover:bg-muted/70",
				pressed ? "border-foreground" : "border-transparent",
			)}
		>
			{children}
		</button>
	);
}
