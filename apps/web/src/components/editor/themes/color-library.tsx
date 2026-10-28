import { isLegibleColor } from "@quizio/core/shared/domain/contrast";
import { ColorPicker } from "@quizio/ui/components/color-picker";
import { RadioGroup, RadioGroupItem } from "@quizio/ui/components/radio-group";
import { cn } from "@quizio/ui/lib/utils";
import { PlusIcon } from "lucide-react";
import { useState } from "react";

import { loadCustomColors, rememberCustomColor } from "@/lib/custom-colors";
import { COLOR_LIBRARY } from "@/lib/theme-palette";

export const ILLEGIBLE_COLOR_MESSAGE =
	"Essa cor deixa o texto difícil de ler. Escolha uma mais clara ou mais escura.";

/**
 * A color of "Crie seu tema" (spec 043, RN-06, RN-11), as Kahoot's popover:
 * "Cores personalizadas" (the + opens the picker; what it confirms is kept
 * in this browser) and "Biblioteca de cores". One radio group, so the arrows
 * walk every swatch; each is named by its code. A color nobody could read is
 * refused at the picker.
 */
export function ColorLibrary({
	label,
	value,
	onPick,
}: {
	label: string;
	value: string;
	onPick: (hex: string) => void;
}) {
	const [custom, setCustom] = useState(loadCustomColors);
	const [picking, setPicking] = useState(false);
	const [illegible, setIllegible] = useState(false);

	if (picking) {
		return (
			<div className="flex flex-col gap-2">
				<ColorPicker
					value={value}
					onCancel={() => {
						setPicking(false);
						setIllegible(false);
					}}
					onConfirm={(hex) => {
						if (!isLegibleColor(hex)) {
							setIllegible(true);
							return;
						}
						setCustom(rememberCustomColor(hex));
						setPicking(false);
						setIllegible(false);
						onPick(hex);
					}}
				/>
				{illegible && (
					<p role="alert" className="w-64 text-destructive text-xs">
						{ILLEGIBLE_COLOR_MESSAGE}
					</p>
				)}
			</div>
		);
	}

	const swatch = (hex: string) => (
		<RadioGroupItem
			key={hex}
			value={hex}
			variant="tile"
			aria-label={hex.toUpperCase()}
			className="aspect-square rounded-none border-0 outline-none focus-visible:z-10 data-checked:z-10 data-checked:shadow-[inset_0_0_0_3px_#000,inset_0_0_0_5px_#fff]"
			style={{ backgroundColor: hex }}
		/>
	);

	return (
		<RadioGroup
			aria-label={label}
			value={value}
			onValueChange={(hex) => onPick(hex as string)}
			className="flex w-72 flex-col gap-3"
		>
			<p className="font-bold text-sm">Cores personalizadas</p>
			<div className="flex flex-wrap gap-1.5">
				<button
					type="button"
					aria-label="Nova cor"
					onClick={() => setPicking(true)}
					className="flex h-8 w-12 items-center justify-center rounded-md border border-border bg-card shadow-press-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
				>
					<PlusIcon aria-hidden="true" className="size-4" />
				</button>
				{custom.map((hex) => (
					<div
						key={hex}
						className={cn(
							"size-8 overflow-hidden rounded-md border border-border",
						)}
					>
						{swatch(hex)}
					</div>
				))}
			</div>
			<p className="font-bold text-sm">Biblioteca de cores</p>
			<div className="grid grid-cols-8 overflow-hidden rounded-sm border border-border">
				{COLOR_LIBRARY.flat().map(swatch)}
			</div>
		</RadioGroup>
	);
}
