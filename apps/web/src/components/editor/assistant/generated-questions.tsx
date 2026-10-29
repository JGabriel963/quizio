import { Skeleton } from "@quizio/ui/components/skeleton";
import { cn } from "@quizio/ui/lib/utils";
import { CheckIcon, PencilLineIcon, SparklesIcon, XIcon } from "lucide-react";
import { useState } from "react";

import {
	createdMessage,
	creditsUsedLabel,
	NOTHING_USABLE_MESSAGE,
	READY_MESSAGE,
	REVIEW_NOTICE,
} from "@/lib/assistant-labels";
import type { AssistantLayout, Generation } from "@/lib/assistant-state";

import { GeneratedQuestionCard } from "./generated-question-card";

const LAYOUT_CLASSES: Record<AssistantLayout, string> = {
	single: "mx-auto max-w-2xl grid-cols-1",
	grid: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
	list: "grid-cols-1",
};

/**
 * What the assistant shows below the source (spec 027): the invitation, the
 * wait, the failure or the grid of created questions to review and check.
 */
export function GeneratedQuestions({
	generation,
	checked,
	layout,
	onToggle,
}: {
	generation: Generation;
	checked: readonly string[];
	layout: AssistantLayout;
	onToggle: (id: string) => void;
}) {
	switch (generation.status) {
		case "idle":
			return (
				<Centered>
					<span aria-hidden="true" className="relative text-brand">
						<PencilLineIcon className="size-12" />
						<SparklesIcon className="absolute -top-2 -left-3 size-5" />
					</span>
					<p className="font-bold text-xl">Sobre o que será o seu quiz?</p>
					<p className="flex items-center gap-1 text-muted-foreground text-sm">
						<SparklesIcon aria-hidden="true" className="size-3 text-brand" />
						Crie um quiz com base em um assunto ou documento
					</p>
				</Centered>
			);
		case "generating":
			return (
				<div className="flex flex-col gap-3 p-4">
					<p
						role="status"
						className="flex items-center gap-2 font-bold text-brand"
					>
						<SparklesIcon aria-hidden="true" className="size-4 animate-pulse" />
						Criando suas perguntas…
					</p>
					<div
						aria-hidden="true"
						className={cn("grid gap-3", LAYOUT_CLASSES[layout])}
					>
						{Array.from({ length: 6 }, (_, index) => (
							<Skeleton key={index} className="h-40 bg-card" />
						))}
					</div>
				</div>
			);
		case "failed":
			return (
				<Centered>
					<p role="alert" className="font-semibold text-destructive">
						{generation.message}
					</p>
				</Centered>
			);
		case "done":
			if (generation.questions.length === 0) {
				return (
					<Centered>
						<p role="alert" className="max-w-md font-semibold">
							{NOTHING_USABLE_MESSAGE}
						</p>
					</Centered>
				);
			}
			return (
				<Results
					generation={generation}
					checked={checked}
					layout={layout}
					onToggle={onToggle}
				/>
			);
	}
}

function Results({
	generation,
	checked,
	layout,
	onToggle,
}: {
	generation: Extract<Generation, { status: "done" }>;
	checked: readonly string[];
	layout: AssistantLayout;
	onToggle: (id: string) => void;
}) {
	const [bannerOpen, setBannerOpen] = useState(true);
	const created = createdMessage({
		count: generation.questions.length,
		requested: generation.requested,
	});

	return (
		<div className="flex flex-col">
			{bannerOpen && (
				<div className="flex items-center gap-2 bg-success px-4 py-2 font-bold text-sm text-success-foreground motion-safe:animate-pop-in">
					<CheckIcon aria-hidden="true" className="size-5 shrink-0" />
					<p className="flex-1">
						{READY_MESSAGE}{" "}
						<span className="font-normal">
							{creditsUsedLabel(generation.creditsUsed)}
						</span>
					</p>
					<button
						type="button"
						aria-label="Fechar aviso"
						onClick={() => setBannerOpen(false)}
						className="rounded-sm p-1 hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white"
					>
						<XIcon aria-hidden="true" className="size-5" />
					</button>
				</div>
			)}
			<div className="flex flex-col gap-3 p-4">
				<p className="text-muted-foreground text-sm">
					{created && (
						<span className="font-semibold text-foreground">{`${created} `}</span>
					)}
					{REVIEW_NOTICE}
				</p>
				<ul
					aria-label="Perguntas criadas"
					data-layout={layout}
					className={cn("grid gap-3", LAYOUT_CLASSES[layout])}
				>
					{generation.questions.map((question) => (
						<GeneratedQuestionCard
							key={question.id}
							question={question}
							checked={checked.includes(question.id)}
							layout={layout}
							onToggle={() => onToggle(question.id)}
						/>
					))}
				</ul>
			</div>
		</div>
	);
}

function Centered({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex h-full min-h-72 flex-col items-center justify-center gap-3 p-6 text-center">
			{children}
		</div>
	);
}
