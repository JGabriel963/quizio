import { useCallback, useEffect, useState } from "react";

/** The browser's full screen for the host's projected screen (spec 008, RN-21). */
export function useFullscreen(): { active: boolean; toggle: () => void } {
	const [active, setActive] = useState(false);

	useEffect(() => {
		const sync = () => setActive(document.fullscreenElement !== null);
		sync();
		document.addEventListener("fullscreenchange", sync);
		return () => document.removeEventListener("fullscreenchange", sync);
	}, []);

	const toggle = useCallback(() => {
		// Browsers refuse it outside a user gesture or in an embedded frame.
		const change = document.fullscreenElement
			? document.exitFullscreen()
			: document.documentElement.requestFullscreen();
		change.catch(() => {});
	}, []);

	return { active, toggle };
}
