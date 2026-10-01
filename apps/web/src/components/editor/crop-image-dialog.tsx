import {
	CROP_MAX_ZOOM,
	CROP_MIN_ZOOM,
	CROP_SHAPES,
	type CropShape,
	defaultCrop,
	type ImageCrop,
} from "@quizio/core/quiz/domain/question-image";
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
	CircleIcon,
	ImageIcon,
	type LucideIcon,
	RectangleHorizontalIcon,
	RectangleVerticalIcon,
	SquareIcon,
} from "lucide-react";
import { type PointerEvent, useRef, useState } from "react";

import {
	clampZoom,
	cropFrameStyle,
	dragCrop,
	type Size,
	spillingImageStyle,
} from "@/lib/image-crop";

const SHAPES: Record<CropShape, { label: string; icon: LucideIcon }> = {
	landscape: { label: "Paisagem", icon: RectangleHorizontalIcon },
	portrait: { label: "Retrato", icon: RectangleVerticalIcon },
	square: { label: "Quadrado", icon: SquareIcon },
	circle: { label: "Círculo", icon: CircleIcon },
};

/** How far an arrow key moves the image under the frame. */
const KEY_STEP = 0.05;

/**
 * "Recortar imagem" (spec 007, RN-18 a RN-21). Always opens from the original
 * image — landscape, widest framing, centered — so saving it untouched undoes
 * an earlier crop.
 */
export function CropImageDialog({
	url,
	onSave,
	onClose,
}: {
	/** The image to crop, or null while the dialog is closed. */
	url: string | null;
	onSave: (crop: ImageCrop) => void;
	onClose: () => void;
}) {
	return (
		<Dialog
			open={url !== null}
			onOpenChange={(open) => {
				if (!open) {
					onClose();
				}
			}}
		>
			<DialogContent showCloseButton={false} className="sm:max-w-3xl">
				{/* Mounted only while open, so every opening starts from the original. */}
				{url !== null && (
					<CropForm url={url} onSave={onSave} onClose={onClose} />
				)}
			</DialogContent>
		</Dialog>
	);
}

function CropForm({
	url,
	onSave,
	onClose,
}: {
	url: string;
	onSave: (crop: ImageCrop) => void;
	onClose: () => void;
}) {
	const [crop, setCrop] = useState<ImageCrop>(() => defaultCrop());
	// The image's own dimensions, known once it loads: they tell how far it
	// travels under the frame.
	const [natural, setNatural] = useState<Size | null>(null);
	const frame = useRef<HTMLDivElement>(null);
	const drag = useRef<{ x: number; y: number } | null>(null);

	const moveBy = (dx: number, dy: number) => {
		const box = frame.current?.getBoundingClientRect();
		if (!box || !natural) {
			return;
		}
		setCrop((current) =>
			dragCrop(current, { dx, dy }, natural, {
				width: box.width,
				height: box.height,
			}),
		);
	};
	const nudge = (dx: number, dy: number) =>
		setCrop((current) => ({
			...current,
			x: Math.min(1, Math.max(0, current.x + dx)),
			y: Math.min(1, Math.max(0, current.y + dy)),
		}));

	const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
		drag.current = { x: event.clientX, y: event.clientY };
		event.currentTarget.setPointerCapture?.(event.pointerId);
	};
	const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
		if (!drag.current) {
			return;
		}
		moveBy(event.clientX - drag.current.x, event.clientY - drag.current.y);
		drag.current = { x: event.clientX, y: event.clientY };
	};
	const endDrag = () => {
		drag.current = null;
	};

	return (
		<>
			<DialogHeader className="pr-0">
				<DialogTitle className="text-2xl">Recortar imagem</DialogTitle>
			</DialogHeader>

			<div
				role="radiogroup"
				aria-label="Forma do recorte"
				className="flex justify-center gap-2 sm:gap-6"
			>
				{CROP_SHAPES.map((shape) => {
					const { label, icon: Icon } = SHAPES[shape];
					const selected = crop.shape === shape;
					return (
						// biome-ignore lint/a11y/useSemanticElements: styled radio buttons, as in Kahoot's crop dialog.
						<button
							key={shape}
							type="button"
							role="radio"
							aria-checked={selected}
							// RN-20: a new shape starts from its widest centered framing.
							onClick={() => setCrop(defaultCrop(shape))}
							className={cn(
								"flex flex-col items-center gap-1 rounded-md px-2 py-1 font-bold text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:px-3",
								selected ? "text-primary" : "text-muted-foreground",
							)}
						>
							<Icon aria-hidden="true" className="size-6" />
							{label}
						</button>
					);
				})}
			</div>

			<div
				role="application"
				aria-label="Arraste a imagem para escolher a parte que aparece"
				// biome-ignore lint/a11y/noNoninteractiveTabindex: the stage is dragged, and moved with the arrow keys.
				tabIndex={0}
				data-slot="crop-stage"
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={endDrag}
				onPointerCancel={endDrag}
				onKeyDown={(event) => {
					const step: Record<string, [number, number]> = {
						ArrowLeft: [-KEY_STEP, 0],
						ArrowRight: [KEY_STEP, 0],
						ArrowUp: [0, -KEY_STEP],
						ArrowDown: [0, KEY_STEP],
					};
					const move = step[event.key];
					if (move) {
						event.preventDefault();
						nudge(...move);
					}
				}}
				className="relative flex aspect-[2/1] w-full cursor-grab touch-none select-none items-center justify-center overflow-hidden bg-neutral-400 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
			>
				{/* The image covers the frame's box and spills out of it... */}
				<div
					ref={frame}
					className="relative h-full max-w-full"
					style={{ aspectRatio: cropFrameStyle(crop).aspectRatio }}
				>
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
						style={natural ? spillingImageStyle(crop, natural) : undefined}
					/>
				</div>
				{/* ...and what is outside the frame is darkened by its shadow. */}
				<div
					aria-hidden="true"
					data-slot="crop-frame"
					data-shape={crop.shape}
					className="pointer-events-none absolute h-full max-w-full shadow-[0_0_0_100vmax_rgb(0_0_0/0.5)]"
					style={cropFrameStyle(crop)}
				/>
			</div>

			<div className="flex items-center justify-center gap-3">
				<ImageIcon
					aria-hidden="true"
					className="size-4 text-muted-foreground"
				/>
				<input
					type="range"
					aria-label="Zoom"
					min={CROP_MIN_ZOOM}
					max={CROP_MAX_ZOOM}
					step={0.01}
					value={crop.zoom}
					onChange={(event) =>
						setCrop((current) => ({
							...current,
							zoom: clampZoom(Number(event.target.value)),
						}))
					}
					className="h-2 w-full max-w-xs cursor-pointer accent-primary"
				/>
				<ImageIcon
					aria-hidden="true"
					className="size-6 text-muted-foreground"
				/>
			</div>

			<DialogFooter className="sm:justify-center">
				<Button variant="secondary" onClick={onClose}>
					Fechar
				</Button>
				<Button onClick={() => onSave(crop)}>Salvar</Button>
			</DialogFooter>
		</>
	);
}
