import { Sheet, SheetContent, SheetTitle } from "@quizio/ui/components/sheet";
import type { ComponentProps } from "react";

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
} & Omit<ComponentProps<typeof ThemesPanel>, "onClose" | "className">) {
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
