import type { QuizPublishState } from "@quizio/core/quiz/domain/quiz";
import { Button } from "@quizio/ui/components/button";
import { Link } from "@tanstack/react-router";
import { LoaderCircleIcon, SettingsIcon } from "lucide-react";

import { QuizStatusBadge } from "@/components/quiz/quiz-status-badge";
import { useSaveStatus, useSaveTracker } from "@/lib/save-tracker";

import { QuizTitleField } from "./quiz-title-field";
import { SaveStatus } from "./save-status";

/** Where the creator asked to go when leaving the editor (spec 006, RN-23). */
export type ExitDestination = "library" | "home";

/**
 * Editor header: brand, title, Configurações, the quiz status, the autosave
 * status, Sair and Salvar (specs 003 and 006). Every way out, and Salvar, first
 * sends what is still pending; what happens next is the editor's call.
 */
export function EditorHeader({
	title,
	publishState,
	publishing = false,
	onSaveTitle,
	onOpenSettings,
	onExit,
	onPublish,
}: {
	title: string | null;
	publishState: QuizPublishState;
	/** A Salvar is on its way: the button is busy (spec 006, RN-07). */
	publishing?: boolean;
	onSaveTitle: (title: string | null) => Promise<unknown>;
	onOpenSettings: () => void;
	onExit: (destination: ExitDestination) => void;
	onPublish: () => void;
}) {
	const tracker = useSaveTracker();
	const status = useSaveStatus();

	/** Nothing typed is lost on the way out or left out of the version (RN-08, RN-23). */
	const afterSaving = async (run: () => void) => {
		if (await tracker.flush()) {
			run();
		}
	};

	return (
		<header className="flex h-14 shrink-0 items-center gap-2 border-border border-b bg-card px-3 sm:gap-4 sm:px-4">
			<Link
				to="/"
				className="shrink-0 font-black text-brand text-xl tracking-tight max-sm:hidden"
				onClick={(event) => {
					// The editor decides: a published quiz with changes asks first.
					event.preventDefault();
					void afterSaving(() => onExit("home"));
				}}
			>
				Quizio
			</Link>

			<div className="flex min-w-0 items-center rounded-md border border-input bg-card pr-1">
				<QuizTitleField initialTitle={title} onSave={onSaveTitle} />
				<Button
					variant="secondary"
					size="sm"
					onClick={() =>
						// The dialog starts from the saved title, never a stale one.
						void afterSaving(onOpenSettings)
					}
				>
					<SettingsIcon data-icon="inline-start" className="sm:hidden" />
					<span className="max-sm:sr-only">Configurações</span>
				</Button>
			</div>

			<QuizStatusBadge
				state={publishState}
				showPublished
				className="max-md:sr-only"
			/>
			<SaveStatus status={status} onRetry={() => void tracker.retry()} />

			<div className="ml-auto flex shrink-0 items-center gap-2">
				<Button
					variant="secondary"
					onClick={() => void afterSaving(() => onExit("library"))}
				>
					Sair
				</Button>
				<Button
					disabled={publishing}
					aria-busy={publishing || undefined}
					onClick={() => void afterSaving(onPublish)}
				>
					{publishing && (
						<LoaderCircleIcon
							data-icon="inline-start"
							aria-hidden="true"
							className="animate-spin"
						/>
					)}
					Salvar
				</Button>
			</div>
		</header>
	);
}
