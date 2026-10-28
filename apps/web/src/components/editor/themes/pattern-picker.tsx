import {
	BACKGROUND_PATTERN_IDS,
	type BackgroundPatternId,
} from "@quizio/core/shared/domain/theme-look";
import { RadioGroup, RadioGroupItem } from "@quizio/ui/components/radio-group";

import { patternImage } from "@/lib/theme-catalog";

/** The patterns' names, for the keyboard and the screen reader (RN-05). */
export const PATTERN_NAMES: Record<BackgroundPatternId, string> = {
	waves: "Ondas",
	peaks: "Montanhas",
	rings: "Círculos",
	tiles: "Mosaico",
};

/**
 * The 4 background patterns of "Crie seu tema", on the chosen color; none is
 * checked while the background is an image.
 */
export function PatternPicker({
	value,
	color,
	onChange,
}: {
	value: BackgroundPatternId | null;
	color: string;
	onChange: (pattern: BackgroundPatternId) => void;
}) {
	return (
		<RadioGroup
			aria-label="Padrão do fundo"
			value={value ?? ""}
			onValueChange={(pattern) => onChange(pattern as BackgroundPatternId)}
			className="grid-cols-4 gap-2"
		>
			{BACKGROUND_PATTERN_IDS.map((pattern) => (
				<RadioGroupItem
					key={pattern}
					value={pattern}
					variant="tile"
					aria-label={PATTERN_NAMES[pattern]}
					className="aspect-video bg-center bg-cover"
					style={{
						backgroundColor: color,
						backgroundImage: `url("${patternImage(pattern)}")`,
					}}
				/>
			))}
		</RadioGroup>
	);
}
