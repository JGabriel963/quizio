import type { ThemeLookView } from "@quizio/core/shared/application/theme-look-view";
import type { ThemeTone } from "@quizio/core/shared/domain/theme";
import type { ThemeLook } from "@quizio/core/shared/domain/theme-look";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@quizio/ui/components/alert-dialog";
import { Button } from "@quizio/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@quizio/ui/components/dialog";
import {
	Popover,
	PopoverContent,
	PopoverTitle,
	PopoverTrigger,
} from "@quizio/ui/components/popover";
import { Progress } from "@quizio/ui/components/progress";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@quizio/ui/components/tooltip";
import { cn } from "@quizio/ui/lib/utils";
import { InfoIcon, Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";
import { type ReactNode, useId, useReducer, useState } from "react";

import { CountedField } from "@/components/groups/counted-field";
import {
	canSaveTheme,
	customThemeForm,
	discardableUploads,
	type EditableTheme,
	formLook,
	formLookView,
	THEME_NAME_MAX_LENGTH,
	type ThemeFileSlot,
	type ThemeFormFile,
	themeFormChanged,
	themeFormReducer,
} from "@/lib/custom-theme-form";
import {
	ACCEPTED_IMAGE_TYPES,
	IMAGE_REJECTED_MESSAGE,
	IMAGE_UPLOAD_FAILED_MESSAGE,
	isAcceptedImage,
} from "@/lib/question-image-upload";
import { shownTheme, themeStyle } from "@/lib/theme-catalog";
import {
	CROPPED_WIDTH,
	type cropImage,
	type ThemeCropShape,
} from "@/lib/theme-image-crop";

import { ColorLibrary } from "./color-library";
import { ImageCropDialog } from "./image-crop-dialog";
import { PatternPicker } from "./pattern-picker";
import { type PreviewSlide, ThemePreview } from "./theme-preview";

/** Where each part shows best: the logo and the accent in the lobby. */
const SLIDE_OF: Record<Row, PreviewSlide | null> = {
	logo: "Lobby",
	background: null,
	accent: "Lobby",
};

export const THEME_SAVE_FAILED_MESSAGE =
	"Não foi possível salvar o tema. Tente de novo.";

/** A theme as Salvar gives it back: for "Seus temas" and the editor's canvas. */
export interface SavedCustomTheme {
	id: string;
	name: string;
	look: ThemeLook;
	view: ThemeLookView;
}

/** The dialog's effects, wired by the editor (tRPC, the bucket, the canvas). */
export interface CustomThemeDialogActions {
	upload: (
		file: File,
		onProgress: (fraction: number) => void,
	) => Promise<ThemeFormFile>;
	discardUploads: (keys: string[]) => void;
	save: (input: {
		themeId: string | null;
		name: string;
		look: ThemeLook;
	}) => Promise<SavedCustomTheme>;
	measureTone: (file: File) => Promise<ThemeTone>;
	crop: typeof cropImage;
}

type Row = "logo" | "background" | "accent";

/** How each file is cut (spec 043): the logo either way, the background as the screen. */
const CROP_OF: Record<
	ThemeFileSlot,
	{ shapes: ThemeCropShape[]; width: number }
> = {
	logo: { shapes: ["landscape", "square"], width: CROPPED_WIDTH.logo },
	image: { shapes: ["landscape"], width: CROPPED_WIDTH.background },
};

/**
 * "Crie seu tema" and "Editar tema" (spec 043, RN-13 to RN-15), laid out as
 * Kahoot's: the preview on top, then a row for each part, each opening its
 * popover: the logo, the background (a pattern on a color, or an image) and
 * the accent color. A chosen image is cut first (`ImageCropDialog`). What is
 * filled lives in a pure reducer (`custom-theme-form`); the uploads, the save
 * and the discards are here. The parent mounts it again for each theme.
 */
export function CustomThemeDialog({
	open,
	theme,
	actions,
	onClose,
	onSaved,
}: {
	open: boolean;
	/** Null to create one. */
	theme: EditableTheme | null;
	actions: CustomThemeDialogActions;
	onClose: () => void;
	onSaved: (theme: SavedCustomTheme) => void;
}) {
	const [form, dispatch] = useReducer(themeFormReducer, theme, customThemeForm);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [fileErrors, setFileErrors] = useState<
		Record<ThemeFileSlot, string | null>
	>({ logo: null, image: null });
	const [confirming, setConfirming] = useState(false);
	const [openRow, setOpenRow] = useState<Row | null>(null);
	const [backgroundTab, setBackgroundTab] = useState<"image" | "color">(
		"image",
	);
	const [cropping, setCropping] = useState<{
		slot: ThemeFileSlot;
		file: File;
	} | null>(null);
	const look = formLookView(form);
	const [slide, setSlide] = useState<PreviewSlide>("Lobby");

	const requestClose = () => {
		if (saving) {
			return;
		}
		if (themeFormChanged(form) || form.sent.length > 0) {
			setConfirming(true);
		} else {
			onClose();
		}
	};

	const discard = () => {
		const keys = discardableUploads(form, "cancel");
		if (keys.length > 0) {
			actions.discardUploads(keys);
		}
		setConfirming(false);
		onClose();
	};

	/** A file chosen in a popover: refused at once, or cut first. */
	const choose = (slot: ThemeFileSlot, file: File | undefined) => {
		if (!file) {
			return;
		}
		if (!isAcceptedImage(file)) {
			setFileErrors((errors) => ({
				...errors,
				[slot]: IMAGE_REJECTED_MESSAGE,
			}));
			return;
		}
		setFileErrors((errors) => ({ ...errors, [slot]: null }));
		setOpenRow(null);
		setCropping({ slot, file });
	};

	const send = async (slot: ThemeFileSlot, file: File) => {
		dispatch({ type: "uploadStarted", slot });
		try {
			const tone =
				slot === "image" ? await actions.measureTone(file) : undefined;
			const sent = await actions.upload(file, (fraction) =>
				dispatch({ type: "uploadProgress", slot, fraction }),
			);
			dispatch({ type: "uploaded", slot, file: sent, tone });
			if (slot === "image") {
				dispatch({ type: "backgroundKind", kind: "image" });
			}
		} catch {
			dispatch({ type: "uploadFailed", slot });
			setFileErrors((errors) => ({
				...errors,
				[slot]: IMAGE_UPLOAD_FAILED_MESSAGE,
			}));
		}
	};

	const save = async () => {
		if (!canSaveTheme(form) || saving) {
			return;
		}
		setSaving(true);
		setSaveError(null);
		try {
			const saved = await actions.save({
				themeId: form.themeId,
				name: form.name.trim(),
				look: formLook(form),
			});
			const replaced = discardableUploads(form, "save");
			if (replaced.length > 0) {
				actions.discardUploads(replaced);
			}
			onSaved(saved);
			onClose();
		} catch {
			setSaveError(THEME_SAVE_FAILED_MESSAGE);
		} finally {
			setSaving(false);
		}
	};

	const popoverProps = (row: Row) => ({
		open: openRow === row,
		onOpenChange: (next: boolean) => {
			setOpenRow(next ? row : null);
			const shows = SLIDE_OF[row];
			if (next && shows) {
				setSlide(shows);
			}
		},
	});

	return (
		<>
			<Dialog
				open={open}
				onOpenChange={(next) => {
					if (next) {
						return;
					}
					// Escape with a row's popover open closes only the popover.
					if (openRow !== null) {
						setOpenRow(null);
						return;
					}
					requestClose();
				}}
			>
				<DialogContent className="flex max-h-[calc(100svh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
					<DialogHeader className="border-border border-b px-6 py-4">
						<DialogTitle className="text-2xl">
							{form.themeId ? "Editar tema" : "Crie seu tema"}
						</DialogTitle>
					</DialogHeader>
					<div className="flex min-h-0 flex-col gap-5 overflow-y-auto p-4 sm:p-6">
						<ThemePreview look={look} slide={slide} onSlideChange={setSlide} />
						<div className="flex flex-col divide-y divide-border rounded-lg bg-muted px-4 sm:px-5">
							<RowLayout title="Nome">
								<div className="w-full max-w-64">
									<CountedField
										label="Nome"
										labelHidden
										value={form.name}
										max={THEME_NAME_MAX_LENGTH}
										onChange={(name) => dispatch({ type: "name", name })}
									/>
								</div>
							</RowLayout>

							<RowLayout
								title="Logotipo"
								description="Aparece na tela do anfitrião, no lugar do nome do Quizio"
								progress={form.progress.logo}
							>
								<Popover {...popoverProps("logo")}>
									<PopoverTrigger
										render={
											<Button
												type="button"
												variant="secondary"
												className="min-w-36"
											/>
										}
									>
										{form.logo ? (
											<>
												<img
													src={form.logo.url}
													alt=""
													className="h-5 max-w-12 object-contain"
												/>
												Trocar logo
											</>
										) : (
											"Adicionar logo"
										)}
									</PopoverTrigger>
									<PopoverContent
										side="top"
										aria-label={form.logo ? "Trocar logo" : "Adicionar logo"}
										className="w-64 gap-3 p-4"
									>
										<p className="font-bold">Selecionar logotipo</p>
										<FilePickButton
											label="Selecionar logotipo"
											onChoose={(file) => choose("logo", file)}
										/>
										{form.logo && (
											<Button
												type="button"
												variant="ghost"
												size="sm"
												className="self-start text-destructive"
												onClick={() => {
													dispatch({ type: "remove", slot: "logo" });
													setOpenRow(null);
												}}
											>
												<Trash2Icon aria-hidden="true" />
												Remover logotipo
											</Button>
										)}
										<FileError message={fileErrors.logo} />
									</PopoverContent>
								</Popover>
							</RowLayout>

							<RowLayout
								title="Plano de fundo"
								description="Um padrão na cor que preferir ou uma imagem sua"
								progress={form.progress.image}
							>
								<Popover {...popoverProps("background")}>
									<PopoverTrigger
										aria-label="Plano de fundo"
										className="bg-(image:--game-bg-image) h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 border-white bg-(--game-base) bg-center bg-cover shadow-md outline-none ring-1 ring-border focus-visible:ring-3 focus-visible:ring-ring/50"
										style={themeStyle(shownTheme("standard", look))}
									/>
									<PopoverContent
										side="top"
										aria-label="Plano de fundo"
										className="w-80 gap-3 p-4"
									>
										<PopoverTitle className="sr-only">
											Plano de fundo
										</PopoverTitle>
										<div className="flex gap-4 border-border border-b">
											{(
												[
													["image", "Imagem"],
													["color", "Cor"],
												] as const
											).map(([tab, label]) => (
												<button
													key={tab}
													type="button"
													aria-pressed={backgroundTab === tab}
													onClick={() => setBackgroundTab(tab)}
													className="-mb-px border-transparent border-b-2 px-1 pb-1.5 font-semibold text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-brand aria-pressed:text-foreground"
												>
													{label}
												</button>
											))}
										</div>
										{backgroundTab === "image" ? (
											<>
												<p className="font-bold text-sm">Padrões</p>
												<PatternPicker
													value={
														form.backgroundKind === "pattern"
															? form.pattern
															: null
													}
													color={form.backgroundColor}
													onChange={(pattern) => {
														dispatch({ type: "pattern", pattern });
														dispatch({
															type: "backgroundKind",
															kind: "pattern",
														});
													}}
												/>
												<p className="font-bold text-sm">Sua imagem</p>
												<div className="flex items-center gap-2">
													{form.image && (
														<button
															type="button"
															aria-label="Usar sua imagem"
															aria-pressed={form.backgroundKind === "image"}
															onClick={() =>
																dispatch({
																	type: "backgroundKind",
																	kind: "image",
																})
															}
															className="h-14 w-24 overflow-hidden rounded-md border-2 border-transparent outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-primary"
														>
															<img
																src={form.image.url}
																alt=""
																className="size-full object-cover"
															/>
														</button>
													)}
													<FilePickButton
														label="Carregar imagem de fundo"
														compact={form.image !== null}
														onChoose={(file) => choose("image", file)}
													/>
												</div>
												{form.image && (
													<Button
														type="button"
														variant="ghost"
														size="sm"
														className="self-start text-destructive"
														onClick={() =>
															dispatch({ type: "remove", slot: "image" })
														}
													>
														<Trash2Icon aria-hidden="true" />
														Remover imagem
													</Button>
												)}
												<FileError message={fileErrors.image} />
											</>
										) : (
											<ColorLibrary
												label="Cor do fundo"
												value={form.backgroundColor}
												onPick={(color) => {
													dispatch({ type: "backgroundColor", color });
													dispatch({ type: "backgroundKind", kind: "pattern" });
												}}
											/>
										)}
									</PopoverContent>
								</Popover>
							</RowLayout>

							<RowLayout
								title="Cor de contraste"
								info="Pinta os apelidos do lobby, os blocos do pódio e as linhas do placar."
								description="Adicione elementos de destaque na cor que preferir"
							>
								<Popover {...popoverProps("accent")}>
									<PopoverTrigger
										aria-label="Cor de contraste"
										className="h-14 w-20 shrink-0 rounded-md border-2 border-white shadow-md outline-none ring-1 ring-border focus-visible:ring-3 focus-visible:ring-ring/50"
										style={{ backgroundColor: form.accentColor }}
									/>
									<PopoverContent
										side="top"
										aria-label="Cor de contraste"
										className="w-auto p-4"
									>
										<PopoverTitle className="sr-only">
											Cor de contraste
										</PopoverTitle>
										<ColorLibrary
											label="Cor de contraste"
											value={form.accentColor}
											onPick={(color) =>
												dispatch({ type: "accentColor", color })
											}
										/>
									</PopoverContent>
								</Popover>
							</RowLayout>
						</div>
					</div>
					<DialogFooter className="m-0 flex-row items-center justify-end rounded-b-lg border-border border-t bg-card px-6 py-4">
						{saveError && (
							<p role="alert" className="mr-auto text-destructive text-sm">
								{saveError}
							</p>
						)}
						<Button type="button" variant="secondary" onClick={requestClose}>
							Cancelar
						</Button>
						<Button
							type="button"
							disabled={!canSaveTheme(form) || saving}
							onClick={() => void save()}
						>
							{saving && (
								<Loader2Icon aria-hidden="true" className="animate-spin" />
							)}
							Salvar
						</Button>
					</DialogFooter>
					{/* Inside the dialog's tree, so Base UI nests it and the outer one keeps still. */}
					{cropping && (
						<ImageCropDialog
							file={cropping.file}
							shapes={CROP_OF[cropping.slot].shapes}
							outputWidth={CROP_OF[cropping.slot].width}
							crop={actions.crop}
							onCancel={() => setCropping(null)}
							onSave={(file) => {
								const { slot } = cropping;
								setCropping(null);
								void send(slot, file);
							}}
						/>
					)}
				</DialogContent>
			</Dialog>
			<AlertDialog open={confirming} onOpenChange={setConfirming}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Descartar este tema?</AlertDialogTitle>
						<AlertDialogDescription>
							O que você preencheu não será salvo.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Continuar editando</AlertDialogCancel>
						<AlertDialogAction variant="destructive" onClick={discard}>
							Descartar
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

/** A row of the card: what it is on the left, its control on the right. */
function RowLayout({
	title,
	description,
	info,
	progress = null,
	children,
}: {
	title: string;
	description?: string;
	info?: string;
	progress?: number | null;
	children: ReactNode;
}) {
	return (
		<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-4">
			<div className="flex min-w-0 flex-1 basis-48 flex-col gap-0.5">
				<p className="flex items-center gap-1.5 font-semibold">
					{title}
					{info && (
						<Tooltip>
							<TooltipTrigger
								aria-label={`Sobre ${title.toLowerCase()}`}
								className="rounded-full text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
							>
								<InfoIcon aria-hidden="true" className="size-4" />
							</TooltipTrigger>
							<TooltipContent>{info}</TooltipContent>
						</Tooltip>
					)}
				</p>
				{description && (
					<p className="text-muted-foreground text-xs">{description}</p>
				)}
				{progress !== null && (
					<Progress
						value={Math.round(progress * 100)}
						aria-label={`Enviando ${title.toLowerCase()}`}
						className="mt-1 max-w-48"
					/>
				)}
			</div>
			{children}
		</div>
	);
}

/** Kahoot's dashed square with the +: a file input under a label. */
function FilePickButton({
	label,
	compact = false,
	onChoose,
}: {
	label: string;
	compact?: boolean;
	onChoose: (file: File | undefined) => void;
}) {
	const inputId = useId();
	return (
		<label
			htmlFor={inputId}
			title={label}
			className={cn(
				"flex cursor-pointer items-center justify-center rounded-md border-2 border-muted-foreground/40 border-dashed text-muted-foreground hover:border-primary/60 hover:text-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
				compact ? "h-14 w-14" : "h-16 w-24",
			)}
		>
			<PlusIcon aria-hidden="true" className="size-5" />
			<input
				id={inputId}
				type="file"
				aria-label={label}
				accept={ACCEPTED_IMAGE_TYPES.join(",")}
				className="sr-only"
				onChange={(event) => {
					onChoose(event.target.files?.[0]);
					event.target.value = "";
				}}
			/>
		</label>
	);
}

function FileError({ message }: { message: string | null }) {
	return message ? (
		<p role="alert" className="text-destructive text-xs">
			{message}
		</p>
	) : null;
}
