import { readableTextOn } from "@quizio/core/shared/domain/contrast";
import type { ThemeId } from "@quizio/core/shared/domain/theme";
import { Button } from "@quizio/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@quizio/ui/components/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@quizio/ui/components/radio-group";
import { cn } from "@quizio/ui/lib/utils";
import {
	ChevronDownIcon,
	EllipsisVerticalIcon,
	Loader2Icon,
	PlusIcon,
	XIcon,
} from "lucide-react";
import { useId, useState } from "react";

import type { CustomThemeData } from "@/lib/api-types";
import {
	shownTheme,
	THEME_CATALOG,
	THEME_GROUPS,
	themeStyle,
} from "@/lib/theme-catalog";

/** The radio value of a custom theme, apart from the catalog's ids. */
const customValue = (id: string) => `custom:${id}`;

/**
 * "Temas" (spec 042, RN-22 to RN-27): the catalog in its groups, each theme a
 * thumbnail with its name. One radio group for all of them, so the arrow keys
 * move through the whole catalog and the screen reader says which is chosen.
 * Choosing saves at once; `savingId` shows the wait on its thumbnail.
 * "Seus temas" (spec 043, RN-13, RN-16, RN-17) are in the same radio group,
 * first, each with its ⋮.
 */
export function ThemesPanel({
	themeId,
	savingId,
	onSelect,
	customThemes = [],
	customThemeId = null,
	savingCustomId = null,
	onSelectCustom,
	onCreate,
	onEdit,
	onDelete,
	onClose,
	className,
}: {
	themeId: ThemeId;
	savingId: ThemeId | null;
	onSelect: (themeId: ThemeId) => void;
	customThemes?: readonly CustomThemeData[];
	/** The quiz's custom theme, which wins over `themeId`. */
	customThemeId?: string | null;
	savingCustomId?: string | null;
	onSelectCustom?: (theme: CustomThemeData) => void;
	onCreate?: () => void;
	onEdit?: (theme: CustomThemeData) => void;
	onDelete?: (theme: CustomThemeData) => void;
	/** The X: the panel closes and the question gets the width (RN-23). */
	onClose?: () => void;
	className?: string;
}) {
	const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
	const titleId = useId();
	const toggle = (name: string) =>
		setCollapsed((current) => {
			const next = new Set(current);
			if (!next.delete(name)) {
				next.add(name);
			}
			return next;
		});

	return (
		<section
			aria-labelledby={titleId}
			className={cn("flex flex-col gap-4 p-4", className)}
		>
			<div className="flex items-center justify-between border-border border-b pb-3">
				<h2 id={titleId} className="font-bold">
					Temas
				</h2>
				{onClose && (
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label="Fechar temas"
						onClick={onClose}
					>
						<XIcon aria-hidden="true" />
					</Button>
				)}
			</div>

			<RadioGroup
				aria-label="Temas"
				value={customThemeId ? customValue(customThemeId) : themeId}
				onValueChange={(value) => {
					const custom = customThemes.find(
						(theme) => customValue(theme.id) === value,
					);
					if (custom) {
						onSelectCustom?.(custom);
					} else {
						onSelect(value as ThemeId);
					}
				}}
				className="gap-4"
			>
				<ThemeGroup
					name="Seus temas"
					open={!collapsed.has("Seus temas")}
					onToggle={() => toggle("Seus temas")}
				>
					<button
						type="button"
						aria-label="Criar tema"
						onClick={onCreate}
						className="relative flex w-full flex-col overflow-hidden rounded-md border-2 border-muted-foreground/40 border-dashed text-muted-foreground outline-none hover:border-primary/60 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
					>
						{/* Sized as a theme's tile (16:9 and the name band), so the row
						    lines up; the + sits in the middle of the whole of it. */}
						<span aria-hidden="true" className="block aspect-video w-full" />
						<span
							aria-hidden="true"
							className="invisible block px-1.5 py-1 text-xs"
						>
							&nbsp;
						</span>
						<PlusIcon
							aria-hidden="true"
							className="absolute top-1/2 left-1/2 size-5 -translate-x-1/2 -translate-y-1/2"
						/>
					</button>
					{customThemes.map((theme) => (
						<div key={theme.id} className="relative">
							<RadioGroupItem
								value={customValue(theme.id)}
								variant="tile"
								aria-label={theme.name}
								className="relative"
							>
								<span
									aria-hidden="true"
									className="bg-(image:--game-bg-image) block aspect-video w-full bg-(--game-base) bg-center bg-cover"
									style={themeStyle(shownTheme("standard", theme.view))}
								/>
								<span
									className="block truncate px-1.5 py-1 text-center font-bold text-xs"
									style={{
										backgroundColor: theme.view.accentColor,
										color: readableTextOn([theme.view.accentColor]),
									}}
								>
									{theme.name}
								</span>
								{savingCustomId === theme.id && <SavingThemeOverlay />}
							</RadioGroupItem>
							<DropdownMenu>
								<DropdownMenuTrigger
									render={
										<Button
											variant="secondary"
											size="icon-sm"
											aria-label={`Mais opções do tema ${theme.name}`}
											className="absolute top-1 right-1 size-6 rounded-full"
										/>
									}
								>
									<EllipsisVerticalIcon aria-hidden="true" />
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem onClick={() => onEdit?.(theme)}>
										Editar
									</DropdownMenuItem>
									<DropdownMenuItem
										variant="destructive"
										onClick={() => onDelete?.(theme)}
									>
										Excluir
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					))}
				</ThemeGroup>
				{THEME_GROUPS.map((group) => {
					const open = !collapsed.has(group.name);
					return (
						<ThemeGroup
							key={group.name}
							name={group.name}
							open={open}
							onToggle={() => toggle(group.name)}
						>
							{group.themeIds.map((id) => {
								const theme = THEME_CATALOG[id];
								return (
									<RadioGroupItem
										key={id}
										value={id}
										variant="tile"
										aria-label={theme.name}
										className="relative"
									>
										<img
											src={theme.image}
											alt=""
											className="aspect-video w-full object-cover"
										/>
										<span
											className="block truncate px-1.5 py-1 text-center font-bold text-xs"
											style={{
												backgroundColor: theme.accent,
												color: theme.accentText,
											}}
										>
											{theme.name}
										</span>
										{savingId === id && <SavingThemeOverlay />}
									</RadioGroupItem>
								);
							})}
						</ThemeGroup>
					);
				})}
			</RadioGroup>
		</section>
	);
}

function SavingThemeOverlay() {
	return (
		<span
			role="status"
			aria-label="Salvando tema"
			className="absolute inset-0 flex items-center justify-center bg-black/50 text-white"
		>
			<Loader2Icon aria-hidden="true" className="size-6 animate-spin" />
		</span>
	);
}

function ThemeGroup({
	name,
	open,
	onToggle,
	children,
}: {
	name: string;
	open: boolean;
	onToggle: () => void;
	children: React.ReactNode;
}) {
	const contentId = useId();
	return (
		<fieldset aria-label={name} className="flex min-w-0 flex-col gap-2">
			<button
				type="button"
				aria-expanded={open}
				aria-controls={contentId}
				onClick={onToggle}
				className="flex items-center justify-between rounded-sm text-muted-foreground text-sm outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
			>
				{name}
				<ChevronDownIcon
					aria-hidden="true"
					className={cn("size-4 transition-transform", open && "rotate-180")}
				/>
			</button>
			{open && (
				<div id={contentId} className="grid grid-cols-2 gap-2">
					{children}
				</div>
			)}
		</fieldset>
	);
}
