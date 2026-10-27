import type { ThemeId } from "@quizio/core/shared/domain/theme";
import { Badge } from "@quizio/ui/components/badge";
import { Button } from "@quizio/ui/components/button";
import { RadioGroup, RadioGroupItem } from "@quizio/ui/components/radio-group";
import { cn } from "@quizio/ui/lib/utils";
import { ChevronDownIcon, Loader2Icon, PlusIcon, XIcon } from "lucide-react";
import { useId, useState } from "react";

import { THEME_CATALOG, THEME_GROUPS } from "@/lib/theme-catalog";

/**
 * "Temas" (spec 042, RN-22 to RN-27): the catalog in its groups, each theme a
 * thumbnail with its name. One radio group for all of them, so the arrow keys
 * move through the whole catalog and the screen reader says which is chosen.
 * Choosing saves at once; `savingId` shows the wait on its thumbnail.
 */
export function ThemesPanel({
	themeId,
	savingId,
	onSelect,
	onClose,
	className,
}: {
	themeId: ThemeId;
	savingId: ThemeId | null;
	onSelect: (themeId: ThemeId) => void;
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

			<div className="flex flex-col gap-2">
				<p className="text-muted-foreground text-sm">Seus temas</p>
				{/* "Crie seu tema" comes with spec 043 (RN-24). */}
				<div className="flex items-center gap-2">
					<button
						type="button"
						disabled
						aria-label="Criar tema (em breve)"
						className="flex aspect-video w-1/2 items-center justify-center rounded-md border-2 border-muted-foreground/40 border-dashed text-muted-foreground"
					>
						<PlusIcon aria-hidden="true" className="size-5" />
					</button>
					<Badge variant="soon">Em breve</Badge>
				</div>
			</div>

			<RadioGroup
				aria-label="Temas prontos"
				value={themeId}
				onValueChange={(value) => onSelect(value as ThemeId)}
				className="gap-4"
			>
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
										{savingId === id && (
											<span
												role="status"
												aria-label="Salvando tema"
												className="absolute inset-0 flex items-center justify-center bg-black/50 text-white"
											>
												<Loader2Icon
													aria-hidden="true"
													className="size-6 animate-spin"
												/>
											</span>
										)}
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
