import type { Question } from "@quizio/core/quiz/domain/question";
import {
	NO_FORMATTING,
	type TextFormatting,
} from "@quizio/core/shared/domain/text-formatting";
import {
	ANSWER_COLOR_CLASSES,
	AnswerShape,
	answerShapeAt,
} from "@quizio/ui/components/answer-shape";
import { cn } from "@quizio/ui/lib/utils";
import { CheckIcon, ChevronDownIcon, ImageIcon, XIcon } from "lucide-react";
import { useId, useState } from "react";
import {
	QuestionImageView,
	thumbnailImage,
} from "@/components/editor/question-image-view";
import { timeLimitLabel } from "@/lib/question-labels";
import { questionTypeLabel } from "@/lib/quiz-labels";
import { formatSliderNumber } from "@/lib/slider-format";
import {
	DEFAULT_SHOWN_THEME,
	type ShownTheme,
	themeStyle,
} from "@/lib/theme-catalog";
import {
	AnswerImage,
	type AnswerImageShown,
	answerImageLabel,
	answerImageShown,
} from "./answer-image";
import { FormattedText } from "./formatted-text";

/** How "Perguntas (N)" is laid out, as Kahoot's three buttons. */
export const QUESTION_PREVIEW_LAYOUTS = ["large", "grid", "list"] as const;
export type QuestionPreviewLayout = (typeof QUESTION_PREVIEW_LAYOUTS)[number];

/** One line of the answers: its shape, its text and whether it is right. */
interface PreviewAnswer {
	key: string;
	/** Picks the color and the shape (`answerShapeAt`); null for a typed one. */
	shapeIndex: number | null;
	/** Drawn before the text, such as a puzzle answer's place ("1. "). */
	prefix?: string;
	text: string;
	/** A quiz or puzzle answer's marked stretches (spec 048, RN-19). */
	formatting: TextFormatting;
	/** A thumbnail in place of the text (spec 049, RN-24). */
	image?: AnswerImageShown | null;
	correct: boolean;
}

/** An answer's text with its formatting, in normal weight (spec 048, RN-18). */
function PreviewAnswerText({ answer }: { answer: PreviewAnswer }) {
	return (
		<>
			{answer.prefix && <span className="font-normal">{answer.prefix}</span>}
			{answer.image ? (
				<span className="inline-flex size-10 align-middle">
					<AnswerImage
						image={answer.image}
						label={answerImageLabel(answer.shapeIndex ?? 0)}
					/>
				</span>
			) : (
				<FormattedText text={answer.text} formatting={answer.formatting} />
			)}
		</>
	);
}

/** What a question shows under its text, whatever its type. */
function previewAnswers(
	question: Question,
	imageUrls: Readonly<Record<string, string>>,
): PreviewAnswer[] {
	switch (question.type) {
		case "quiz":
			return question.choices.flatMap((choice, index) =>
				choice.text === null && choice.image === null
					? []
					: [
							{
								key: choice.id,
								shapeIndex: index,
								text: choice.text ?? "",
								formatting: choice.textFormatting,
								image: answerImageShown(choice.image, imageUrls),
								correct: choice.correct,
							},
						],
			);
		case "trueFalse":
			// Kahoot's order: Verdadeiro (blue diamond), then Falso (red triangle).
			return [
				{
					key: "true",
					shapeIndex: 1,
					text: "Verdadeiro",
					formatting: NO_FORMATTING,
					correct: question.correct === true,
				},
				{
					key: "false",
					shapeIndex: 0,
					text: "Falso",
					formatting: NO_FORMATTING,
					correct: question.correct === false,
				},
			];
		case "typeAnswer":
			return question.acceptedAnswers.flatMap((answer, index) =>
				answer === null
					? []
					: [
							{
								key: `${index}`,
								shapeIndex: null,
								text: answer,
								formatting: NO_FORMATTING,
								correct: true,
							},
						],
			);
		case "slider":
			return question.answer === null
				? []
				: [
						{
							key: "answer",
							shapeIndex: null,
							text: `${formatSliderNumber(question.answer)}${question.unit ? ` ${question.unit}` : ""}`,
							formatting: NO_FORMATTING,
							correct: true,
						},
					];
		case "puzzle":
			// Slots have no id: the place is the slot (spec 033).
			return question.items.flatMap((item, index) =>
				item === null && !question.itemImages[index]
					? []
					: [
							{
								key: `${index}`,
								shapeIndex: index,
								prefix: `${index + 1}. `,
								text: item ?? "",
								formatting: question.itemFormatting[index] ?? NO_FORMATTING,
								image: answerImageShown(question.itemImages[index], imageUrls),
								correct: false,
							},
						],
			);
	}
}

/**
 * "Perguntas (N)" of the quiz's page, laid out as in Kahoot: big slides, a
 * grid of slides, or a list. The answers' colors always show; their texts and
 * the right ones only with "Mostrar respostas". The slides wear the quiz's
 * theme, as the editor's canvas does (specs 042 and 043).
 */
export function QuizQuestionPreview({
	questions,
	imageUrls,
	layout,
	showAnswers,
	theme = DEFAULT_SHOWN_THEME,
}: {
	questions: readonly Question[];
	imageUrls: Readonly<Record<string, string>>;
	layout: QuestionPreviewLayout;
	showAnswers: boolean;
	theme?: ShownTheme;
}) {
	if (layout === "list") {
		return (
			<ol className="flex flex-col gap-3">
				{questions.map((question, index) => (
					<QuestionRow
						// "Mostrar respostas" opens (or closes) every row anew.
						key={`${question.id}:${showAnswers}`}
						question={question}
						number={index + 1}
						imageUrl={
							question.image ? imageUrls[question.image.key] : undefined
						}
						imageUrls={imageUrls}
						showAnswers={showAnswers}
						theme={theme}
					/>
				))}
			</ol>
		);
	}
	return (
		<ol
			className={cn(
				"grid grid-cols-1 gap-3",
				layout === "grid" && "md:grid-cols-2",
			)}
		>
			{questions.map((question, index) => (
				<QuestionSlide
					key={question.id}
					question={question}
					number={index + 1}
					imageUrl={question.image ? imageUrls[question.image.key] : undefined}
					imageUrls={imageUrls}
					large={layout === "large"}
					showAnswers={showAnswers}
					theme={theme}
				/>
			))}
		</ol>
	);
}

function questionCaption(question: Question, number: number): string {
	return `${number} · ${questionTypeLabel(question.type)} · ${timeLimitLabel(question.timeLimitSeconds)}`;
}

/** The theme's background, as `GameScreen` and the editor's canvas draw it. */
function themeBackground(theme: ShownTheme) {
	return {
		"data-theme": theme.custom ? "custom" : theme.themeId,
		style: themeStyle(theme),
	};
}

const THEME_BACKGROUND =
	"bg-(image:--game-bg-image) bg-(--game-base) bg-center bg-cover";

/** A question drawn as its slide: text on top, image, answers at the bottom. */
function QuestionSlide({
	question,
	number,
	imageUrl,
	imageUrls,
	large,
	showAnswers,
	theme,
}: {
	question: Question;
	number: number;
	imageUrl: string | undefined;
	/** The answers' images by key (spec 049). */
	imageUrls: Readonly<Record<string, string>>;
	large: boolean;
	showAnswers: boolean;
	theme: ShownTheme;
}) {
	const background =
		question.image?.placement === "background" ? imageUrl : undefined;
	const media =
		question.image && question.image.placement === "media" && imageUrl
			? question.image
			: null;
	const answers = previewAnswers(question, imageUrls);

	return (
		<li
			data-slot="question-slide"
			{...themeBackground(theme)}
			className={cn(
				"relative isolate flex flex-col gap-3 overflow-hidden rounded-lg shadow-sm",
				THEME_BACKGROUND,
				large ? "min-h-96 p-4 sm:p-5" : "min-h-52 p-2.5 sm:min-h-72",
			)}
		>
			{background && (
				<img
					src={background}
					alt=""
					className="absolute inset-0 -z-10 size-full object-cover"
				/>
			)}
			<span className="sr-only">{questionCaption(question, number)}</span>
			<p
				className={cn(
					"rounded-md bg-card/90 px-4 py-2 text-center text-foreground shadow-sm",
					large ? "text-xl sm:text-3xl" : "text-base sm:text-lg",
				)}
			>
				{question.text ? (
					<FormattedText
						text={question.text}
						formatting={question.textFormatting}
					/>
				) : (
					<span className="text-muted-foreground">Pergunta sem texto</span>
				)}
			</p>
			<div
				className={cn(
					"flex flex-1 items-center justify-center",
					large ? "min-h-40" : "min-h-16 sm:min-h-24",
				)}
			>
				{media && imageUrl && (
					<span
						className={cn(
							"block aspect-video overflow-hidden rounded-md",
							large ? "h-56 sm:h-64" : "h-32 sm:h-36",
						)}
					>
						<QuestionImageView image={media} url={imageUrl} />
					</span>
				)}
			</div>
			<SlideAnswers
				question={question}
				answers={answers}
				large={large}
				showAnswers={showAnswers}
			/>
		</li>
	);
}

function SlideAnswers({
	question,
	answers,
	large,
	showAnswers,
}: {
	question: Question;
	answers: PreviewAnswer[];
	large: boolean;
	showAnswers: boolean;
}) {
	const size = large
		? "min-h-12 px-3 py-2 text-base sm:text-xl"
		: "min-h-8 px-2.5 py-1 text-sm";

	// Typed and slider answers have no colors to show while hidden.
	if (question.type === "typeAnswer" || question.type === "slider") {
		return (
			<ul
				aria-label={showAnswers ? "Respostas aceitas" : undefined}
				className="flex flex-wrap gap-1.5"
			>
				{showAnswers ? (
					answers.map((answer) => (
						<li
							key={answer.key}
							className={cn(
								"flex flex-1 items-center gap-2 rounded-md bg-success font-bold text-success-foreground",
								size,
							)}
						>
							<span className="min-w-0 flex-1 break-words">
								<PreviewAnswerText answer={answer} />
							</span>
							<CheckIcon aria-hidden="true" className="size-4 stroke-3" />
						</li>
					))
				) : (
					<li
						className={cn(
							"flex flex-1 items-center justify-center rounded-md bg-card/90 font-semibold text-muted-foreground",
							size,
						)}
					>
						{questionTypeLabel(question.type)}
					</li>
				)}
			</ul>
		);
	}

	return (
		<ul
			aria-label={showAnswers ? "Respostas" : undefined}
			className={cn(
				"grid gap-1.5",
				question.type === "puzzle" ? "grid-cols-1" : "grid-cols-2",
			)}
		>
			{answers.map((answer) => {
				const shape = answerShapeAt(answer.shapeIndex ?? 0);
				return (
					<li
						key={answer.key}
						className={cn(
							"flex items-center gap-2 rounded-md font-bold text-answer-foreground",
							ANSWER_COLOR_CLASSES[shape],
							size,
						)}
					>
						<AnswerShape
							shape={shape}
							className={cn("shrink-0", large ? "size-5" : "size-3.5")}
						/>
						{showAnswers && (
							<>
								<span className="min-w-0 flex-1 break-words">
									<PreviewAnswerText answer={answer} />
								</span>
								{answer.correct && (
									<>
										<CheckIcon
											aria-hidden="true"
											className="size-4 shrink-0 stroke-3"
										/>
										<span className="sr-only">(correta)</span>
									</>
								)}
							</>
						)}
					</li>
				);
			})}
		</ul>
	);
}

/** The list layout: thumbnail, type and text; the answers with their marks. */
function QuestionRow({
	question,
	number,
	imageUrl,
	imageUrls,
	showAnswers,
	theme,
}: {
	question: Question;
	number: number;
	imageUrl: string | undefined;
	/** The answers' images by key (spec 049). */
	imageUrls: Readonly<Record<string, string>>;
	showAnswers: boolean;
	theme: ShownTheme;
}) {
	const answers = previewAnswers(question, imageUrls);
	const marked = question.type === "quiz" || question.type === "trueFalse";
	// Each row opens on its own too, as in Kahoot's list.
	const [open, setOpen] = useState(showAnswers);
	const answersId = useId();

	return (
		<li className="overflow-hidden rounded-lg bg-card shadow-sm ring-1 ring-border">
			<div className="flex items-center gap-4 p-2">
				<span
					data-slot="question-thumbnail"
					{...themeBackground(theme)}
					className={cn(
						"flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md text-game-fg/70",
						THEME_BACKGROUND,
					)}
				>
					{question.image && imageUrl ? (
						<QuestionImageView
							image={thumbnailImage(question.image)}
							url={imageUrl}
							decorative
							className={
								question.image.placement === "background"
									? "[&_img]:object-cover"
									: undefined
							}
						/>
					) : (
						<ImageIcon aria-hidden="true" className="size-5" />
					)}
				</span>
				<div className="flex min-w-0 flex-1 flex-col">
					<span className="text-muted-foreground text-xs">
						{number} · {questionTypeLabel(question.type)} ·{" "}
						{timeLimitLabel(question.timeLimitSeconds)}
					</span>
					<p className="truncate sm:whitespace-normal sm:break-words">
						{question.text ? (
							<FormattedText
								text={question.text}
								formatting={question.textFormatting}
							/>
						) : (
							<span className="text-muted-foreground">Pergunta sem texto</span>
						)}
					</p>
				</div>
				{answers.length > 0 && (
					<button
						type="button"
						aria-expanded={open}
						aria-controls={answersId}
						aria-label={`Respostas da pergunta ${number}`}
						onClick={() => setOpen((shown) => !shown)}
						className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
					>
						<ChevronDownIcon
							aria-hidden="true"
							className={cn(
								"size-4 transition-transform",
								open && "rotate-180",
							)}
						/>
					</button>
				)}
			</div>
			{open && answers.length > 0 && (
				<ul
					id={answersId}
					aria-label="Respostas"
					className="divide-y divide-border border-border border-t"
				>
					{answers.map((answer) => {
						const shape =
							answer.shapeIndex === null
								? null
								: answerShapeAt(answer.shapeIndex);
						return (
							<li
								key={answer.key}
								className="flex items-center gap-3 px-3 py-2 text-sm"
							>
								{shape ? (
									<span
										className={cn(
											"flex size-5 shrink-0 items-center justify-center rounded-sm text-answer-foreground",
											ANSWER_COLOR_CLASSES[shape],
										)}
									>
										<AnswerShape shape={shape} className="size-3" />
									</span>
								) : (
									<span className="size-5 shrink-0 rounded-sm bg-success" />
								)}
								<span className="min-w-0 flex-1 break-words">
									<PreviewAnswerText answer={answer} />
								</span>
								{marked &&
									(answer.correct ? (
										<>
											<CheckIcon
												aria-hidden="true"
												className="size-4 shrink-0 text-success"
											/>
											<span className="sr-only">(correta)</span>
										</>
									) : (
										<XIcon
											aria-hidden="true"
											className="size-4 shrink-0 text-destructive"
										/>
									))}
							</li>
						);
					})}
				</ul>
			)}
		</li>
	);
}
