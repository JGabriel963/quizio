import { worstContrast } from "@quizio/core/shared/domain/contrast";
import { THEME_IDS } from "@quizio/core/shared/domain/theme";
import { themeOf, themeTone } from "@/lib/theme-catalog";

import { GameScreen, Wordmark } from "./game-screen";

const ratio = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

/**
 * Every theme on a small game screen, with the pieces that follow it (the
 * wordmark, a nickname card, a chip) and the worst contrast of its text, for
 * the eye check of `/design-system` (spec 042, RN-20, RN-21).
 */
export function ThemeShowcase() {
	return (
		<div className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-4">
			{THEME_IDS.map((id) => {
				const theme = themeOf(id);
				const contrast = worstContrast(theme.text, theme.surfaces);
				return (
					<figure
						key={id}
						aria-label={theme.name}
						className="flex flex-col gap-1"
					>
						<GameScreen
							themeId={id}
							className="flex aspect-video min-h-0 flex-col items-center justify-center gap-2 rounded-md p-3"
						>
							<Wordmark className="text-2xl" />
							<span className="rounded-md bg-game-accent px-3 py-1 font-bold text-game-accent-fg text-sm">
								Ana
							</span>
							<span className="rounded-sm bg-game-chip px-2 py-0.5 text-game-chip-fg text-xs">
								Aguardando os participantes
							</span>
						</GameScreen>
						<figcaption className="text-sm">
							<strong>{theme.name}</strong>{" "}
							<span className="text-muted-foreground">
								{themeTone(id) === "light" ? "claro" : "escuro"} ·{" "}
								{ratio.format(contrast)}:1
							</span>
						</figcaption>
					</figure>
				);
			})}
		</div>
	);
}
