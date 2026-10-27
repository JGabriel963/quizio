import type { ThemeId } from "@quizio/core/shared/domain/theme";
import { Sheet, SheetContent, SheetTitle } from "@quizio/ui/components/sheet";

import { ThemesPanel } from "./themes-panel";

/**
 * "Temas" on compact screens, where the side rail does not fit: the same
 * panel, sliding over the editor (spec 042, RN-28).
 */
export function ThemesSheet({
	open,
	onOpenChange,
	...panel
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	themeId: ThemeId;
	savingId: ThemeId | null;
	onSelect: (themeId: ThemeId) => void;
}) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				showCloseButton={false}
				className="w-full overflow-y-auto sm:max-w-sm"
			>
				<SheetTitle className="sr-only">Temas</SheetTitle>
				<ThemesPanel {...panel} onClose={() => onOpenChange(false)} />
			</SheetContent>
		</Sheet>
	);
}
