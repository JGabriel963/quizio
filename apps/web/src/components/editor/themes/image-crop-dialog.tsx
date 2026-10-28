import { Button } from "@quizio/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@quizio/ui/components/dialog";
import { cn } from "@quizio/ui/lib/utils";
import {
	ImageIcon,
	Loader2Icon,
	RectangleHorizontalIcon,
	SquareIcon,
} from "lucide-react";
import { type PointerEvent, useEffect, useRef, useState } from "react";

import { dragCrop, type Size } from "@/lib/image-crop";
import {
	cropImage,
	spillingImageStyle,
	THEME_CROP_ASPECT,
	THEME_CROP_MAX_ZOOM,
	type ThemeCrop,
	type ThemeCropShape,
} from "@/lib/theme-image-crop";

const SHAPE_LABELS: Record<ThemeCropShape, string> = {
	landscape: "Paisagem",
	square: "Quadrado",
};
const SHAPE_ICONS = {
	landscape: RectangleHorizontalIcon,
	square: SquareIcon,
} as const;

/**
 * "Recortar imagem" (spec 043), as Kahoot's: the shape, the image dragged
 * under the frame, the zoom, and Salvar cuts it in the browser. `crop` is the
 * canvas work, given in tests.
 */
export function ImageCropDialog({
	file,
	shapes,
	outputWidth,
	crop = cropImage,
	onSave,
	onCancel,
}: {
	file: File;
	shapes: readonly ThemeCropShape[];
	outputWidth: number;
	crop?: typeof cropImage;
	onSave: (file: File) => void;
	onCancel: () => void;
}) {
	const [shape, setShape] = useState<ThemeCropShape>(shapes[0] ?? "landscape");
	const [framing, setFraming] = useState<ThemeCrop>({
		zoom: 1,
		x: 0.5,
		y: 0.5,
	});
	const [natural, setNatural] = useState<Size | null>(null);
	const [url, setUrl] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [failed, setFailed] = useState(false);
	const frame = useRef<HTMLDivElement>(null);
	const drag = useRef<{ x: number; y: number } | null>(null);
	const aspect = THEME_CROP_ASPECT[shape];

	useEffect(() => {
		const objectUrl = URL.createObjectURL(file);
		setUrl(objectUrl);
		return () => URL.revokeObjectURL(objectUrl);
	}, [file]);

	const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
		const box = frame.current?.getBoundingClientRect();
		if (!drag.current || !box || !natural) {
			return;
		}
		const delta = {
			dx: event.clientX - drag.current.x,
			dy: event.clientY - drag.current.y,
		};
		drag.current = { x: event.clientX, y: event.clientY };
		setFraming((current) => {
			const moved = dragCrop(
				{ ...current, shape: "landscape" },
				delta,
				natural,
				{ width: box.width, height: box.height },
			);
			return { zoom: moved.zoom, x: moved.x, y: moved.y };
		});
	};

	const save = async () => {
		setSaving(true);
		setFailed(false);
		try {
			onSave(await crop(file, framing, aspect, outputWidth));
		} catch {
			setFailed(true);
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) {
					onCancel();
				}
			}}
		>
			<DialogContent showCloseButton={false} className="sm:max-w-3xl">
				<DialogHeader>
					<DialogTitle className="text-2xl">Recortar imagem</DialogTitle>
				</DialogHeader>
				{shapes.length > 1 && (
					<div className="flex justify-center gap-6">
						{shapes.map((option) => {
							const Icon = SHAPE_ICONS[option];
							return (
								<button
									key={option}
									type="button"
									aria-pressed={shape === option}
									onClick={() => {
										setShape(option);
										setFraming({ zoom: 1, x: 0.5, y: 0.5 });
									}}
									className="flex flex-col items-center gap-1 rounded-md px-3 py-1 font-semibold text-muted-foreground text-sm outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:text-foreground"
								>
									<Icon aria-hidden="true" className="size-6" />
									{SHAPE_LABELS[option]}
								</button>
							);
						})}
					</div>
				)}
				<div
					role="application"
					aria-label="Arraste a imagem para escolher a parte que aparece"
					onPointerDown={(event) => {
						drag.current = { x: event.clientX, y: event.clientY };
						event.currentTarget.setPointerCapture?.(event.pointerId);
					}}
					onPointerMove={onPointerMove}
					onPointerUp={() => {
						drag.current = null;
					}}
					onPointerCancel={() => {
						drag.current = null;
					}}
					className="relative flex h-72 w-full cursor-grab touch-none select-none items-center justify-center overflow-hidden rounded-md bg-neutral-500 active:cursor-grabbing sm:h-96"
				>
					<div
						ref={frame}
						className="relative max-h-full max-w-full"
						style={{
							aspectRatio: String(aspect),
							height: aspect >= 1.5 ? undefined : "100%",
							width: aspect >= 1.5 ? "100%" : undefined,
						}}
					>
						{url && (
							<img
								src={url}
								alt=""
								draggable={false}
								onLoad={(event) =>
									setNatural({
										width: event.currentTarget.naturalWidth,
										height: event.currentTarget.naturalHeight,
									})
								}
								className={cn(!natural && "invisible")}
								style={
									natural
										? spillingImageStyle(framing, natural, aspect)
										: undefined
								}
							/>
						)}
						<div
							aria-hidden="true"
							className="pointer-events-none absolute inset-0 shadow-[0_0_0_100vmax_rgb(0_0_0/0.45)] outline-2 outline-white"
						/>
					</div>
				</div>
				<div className="flex items-center justify-center gap-3">
					<ImageIcon
						aria-hidden="true"
						className="size-4 text-muted-foreground"
					/>
					<input
						type="range"
						aria-label="Zoom"
						min={1}
						max={THEME_CROP_MAX_ZOOM}
						step={0.01}
						value={framing.zoom}
						onChange={(event) =>
							setFraming((current) => ({
								...current,
								zoom: Number(event.target.value),
							}))
						}
						className="h-2 w-64 cursor-pointer accent-primary"
					/>
					<ImageIcon
						aria-hidden="true"
						className="size-6 text-muted-foreground"
					/>
				</div>
				{failed && (
					<p role="alert" className="text-center text-destructive text-sm">
						Não foi possível recortar a imagem. Tente outra.
					</p>
				)}
				<DialogFooter className="sm:justify-center">
					<Button type="button" variant="secondary" onClick={onCancel}>
						Fechar
					</Button>
					<Button type="button" disabled={saving} onClick={() => void save()}>
						{saving && (
							<Loader2Icon aria-hidden="true" className="animate-spin" />
						)}
						Salvar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
