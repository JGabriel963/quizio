import {
	assertMediaContentType,
	assertMediaSize,
} from "@quizio/core/media/domain/media-policy";
import {
	CROP_MAX_ZOOM,
	CROP_MIN_ZOOM,
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
import { Progress } from "@quizio/ui/components/progress";
import { cn } from "@quizio/ui/lib/utils";
import { ImageIcon } from "lucide-react";
import {
	type DragEvent,
	type PointerEvent,
	useEffect,
	useId,
	useReducer,
	useRef,
	useState,
} from "react";

import {
	cropFrameStyle,
	dragCrop,
	type Size,
	spillingImageStyle,
} from "@/lib/image-crop";
import { initialPhotoState, photoReducer } from "@/lib/profile-photo-state";

export type UploadProfilePhoto = (
	file: File,
	crop: ImageCrop,
	options: { signal: AbortSignal; onProgress: (fraction: number) => void },
) => Promise<void>;

/**
 * "Carregar imagem" of Seu perfil (spec 039, RN-07 to RN-11): choose or drop
 * an image, frame it in the circle with the zoom, and send it. The route
 * crops, uploads and saves through `upload`.
 */
export function ProfilePhotoDialog({
	open,
	hasPhoto,
	onClose,
	upload,
	onRemove,
}: {
	open: boolean;
	hasPhoto: boolean;
	onClose: () => void;
	upload: UploadProfilePhoto;
	onRemove: () => Promise<void>;
}) {
	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) {
					onClose();
				}
			}}
		>
			<DialogContent showCloseButton={false} className="sm:max-w-lg">
				{/* Mounted only while open, so every opening starts empty. */}
				{open && (
					<PhotoForm
						hasPhoto={hasPhoto}
						onClose={onClose}
						upload={upload}
						onRemove={onRemove}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}

function PhotoForm({
	hasPhoto,
	onClose,
	upload,
	onRemove,
}: {
	hasPhoto: boolean;
	onClose: () => void;
	upload: UploadProfilePhoto;
	onRemove: () => Promise<void>;
}) {
	const inputId = useId();
	const [state, dispatch] = useReducer(photoReducer, initialPhotoState);
	const [natural, setNatural] = useState<Size | null>(null);
	const [removing, setRemoving] = useState(false);
	const abort = useRef<AbortController | null>(null);
	const frame = useRef<HTMLDivElement>(null);
	const drag = useRef<{ x: number; y: number } | null>(null);
	const previewUrl = state.kind === "empty" ? null : state.previewUrl;

	// The preview's object URL goes with the image it showed.
	useEffect(
		() => () => {
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}
		},
		[previewUrl],
	);
	useEffect(() => () => abort.current?.abort(), []);

	function choose(file: File | undefined) {
		if (!file || state.kind === "uploading") {
			return;
		}
		try {
			assertMediaContentType(file.type);
			assertMediaSize(file.size);
		} catch {
			dispatch({ type: "refused" });
			return;
		}
		setNatural(null);
		dispatch({ type: "chosen", file, previewUrl: URL.createObjectURL(file) });
	}

	async function send() {
		if (state.kind !== "cropping") {
			return;
		}
		const controller = new AbortController();
		abort.current = controller;
		dispatch({ type: "uploadStarted" });
		try {
			await upload(state.file, state.crop, {
				signal: controller.signal,
				onProgress: (progress) => dispatch({ type: "progressed", progress }),
			});
			onClose();
		} catch (error) {
			dispatch({
				type:
					error instanceof DOMException && error.name === "AbortError"
						? "uploadCancelled"
						: "uploadFailed",
			});
		}
	}

	async function remove() {
		setRemoving(true);
		try {
			await onRemove();
			onClose();
		} finally {
			setRemoving(false);
		}
	}

	const moveBy = (dx: number, dy: number) => {
		const box = frame.current?.getBoundingClientRect();
		if (state.kind !== "cropping" || !box || !natural) {
			return;
		}
		dispatch({
			type: "moved",
			crop: dragCrop(state.crop, { dx, dy }, natural, {
				width: box.width,
				height: box.height,
			}),
		});
	};
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
	const onDrop = (event: DragEvent<HTMLElement>) => {
		event.preventDefault();
		choose(event.dataTransfer.files[0]);
	};

	const error = state.kind === "uploading" ? null : state.error;

	return (
		<>
			<DialogHeader className="pr-0">
				<DialogTitle className="text-2xl">Carregar imagem</DialogTitle>
			</DialogHeader>

			<section
				aria-label="Imagem do perfil"
				onDragOver={(event) => event.preventDefault()}
				onDrop={onDrop}
				className="flex aspect-[5/3] w-full items-center justify-center overflow-hidden rounded-md border-2 border-border border-dashed bg-muted"
			>
				{state.kind === "empty" && (
					<div className="flex flex-col items-center gap-3 p-4 text-center">
						<ImageIcon
							aria-hidden="true"
							className="size-10 text-muted-foreground"
						/>
						<p>Carregue a imagem ou arraste o arquivo até aqui</p>
						<p className="text-sm">ou</p>
						<label
							htmlFor={inputId}
							className="cursor-pointer rounded-md border border-border bg-card px-4 py-2 font-semibold shadow-press-sm focus-within:ring-3 focus-within:ring-ring/50"
						>
							Carregar imagem
							<input
								id={inputId}
								type="file"
								accept="image/jpeg,image/png,image/gif,image/webp"
								className="sr-only"
								onChange={(event) => {
									choose(event.target.files?.[0]);
									event.target.value = "";
								}}
							/>
						</label>
					</div>
				)}

				{state.kind === "cropping" && (
					<div
						role="application"
						aria-label="Arraste a imagem para escolher a parte que aparece"
						onPointerDown={onPointerDown}
						onPointerMove={onPointerMove}
						onPointerUp={endDrag}
						onPointerCancel={endDrag}
						className="relative flex h-full w-full cursor-grab touch-none select-none items-center justify-center overflow-hidden bg-neutral-400 active:cursor-grabbing"
					>
						<div
							ref={frame}
							className="relative h-full max-w-full"
							style={{ aspectRatio: cropFrameStyle(state.crop).aspectRatio }}
						>
							<img
								src={state.previewUrl}
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
									natural ? spillingImageStyle(state.crop, natural) : undefined
								}
							/>
						</div>
						<div
							aria-hidden="true"
							className="pointer-events-none absolute h-full max-w-full shadow-[0_0_0_100vmax_rgb(0_0_0/0.5)]"
							style={cropFrameStyle(state.crop)}
						/>
						<div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-3">
							<ImageIcon aria-hidden="true" className="size-4 text-white" />
							<input
								type="range"
								aria-label="Zoom"
								min={CROP_MIN_ZOOM}
								max={CROP_MAX_ZOOM}
								step={0.01}
								value={state.crop.zoom}
								onPointerDown={(event) => event.stopPropagation()}
								onChange={(event) =>
									dispatch({
										type: "zoomed",
										zoom: Number(event.target.value),
									})
								}
								className="h-2 w-40 cursor-pointer accent-white"
							/>
							<ImageIcon aria-hidden="true" className="size-6 text-white" />
						</div>
					</div>
				)}

				{state.kind === "uploading" && (
					<div className="flex w-2/3 flex-col gap-2 text-sm">
						<Progress value={Math.round(state.progress * 100)} />
						<p>
							Carregando imagem…{" "}
							<button
								type="button"
								aria-label="Cancelar o envio"
								onClick={() => abort.current?.abort()}
								className="underline"
							>
								Cancelar
							</button>
						</p>
					</div>
				)}
			</section>

			{error && (
				<p role="alert" className="text-destructive text-sm">
					{error}
				</p>
			)}
			<p className="text-sm">
				A foto do perfil será pública e poderá ser vista por qualquer pessoa com
				conta no Quizio.
			</p>

			<DialogFooter className="items-center sm:justify-center">
				{hasPhoto && state.kind === "empty" && (
					<Button
						variant="ghost"
						className="text-destructive sm:mr-auto"
						onClick={remove}
						disabled={removing}
					>
						Remover foto
					</Button>
				)}
				<Button variant="secondary" onClick={onClose}>
					Cancelar
				</Button>
				<Button onClick={send} disabled={state.kind !== "cropping"}>
					{state.kind === "uploading" ? "Carregando" : "Carregar"}
				</Button>
			</DialogFooter>
		</>
	);
}
