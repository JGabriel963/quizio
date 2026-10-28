/**
 * A color as the `ColorPicker` handles it: hue from 0 to 360, saturation and
 * value from 0 to 1. Colors come and go as `#rrggbb`.
 */
export interface Hsv {
	h: number;
	s: number;
	v: number;
}

const channel = (value: number) =>
	Math.round(Math.min(255, Math.max(0, value * 255)))
		.toString(16)
		.padStart(2, "0");

export function hsvToHex({ h, s, v }: Hsv): string {
	const f = (n: number) => {
		const k = (n + h / 60) % 6;
		return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
	};
	return `#${channel(f(5))}${channel(f(3))}${channel(f(1))}`;
}

export function hexToHsv(hex: string): Hsv {
	const value = Number.parseInt(hex.slice(1), 16);
	const r = ((value >> 16) & 0xff) / 255;
	const g = ((value >> 8) & 0xff) / 255;
	const b = (value & 0xff) / 255;
	const max = Math.max(r, g, b);
	const delta = max - Math.min(r, g, b);
	let h = 0;
	if (delta > 0) {
		if (max === r) {
			h = 60 * (((g - b) / delta) % 6);
		} else if (max === g) {
			h = 60 * ((b - r) / delta + 2);
		} else {
			h = 60 * ((r - g) / delta + 4);
		}
	}
	return { h: (h + 360) % 360, s: max === 0 ? 0 : delta / max, v: max };
}

/** A typed hex code, 3 or 6 digits, `#` optional: `#rrggbb`, or null. */
export function parseHexInput(text: string): string | null {
	const digits = text.trim().replace(/^#/, "").toLowerCase();
	if (/^[0-9a-f]{3}$/.test(digits)) {
		return `#${[...digits].map((digit) => digit + digit).join("")}`;
	}
	return /^[0-9a-f]{6}$/.test(digits) ? `#${digits}` : null;
}
