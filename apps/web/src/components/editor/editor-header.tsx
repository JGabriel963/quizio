import { Button } from "@quizio/ui/components/button";
import { Link } from "@tanstack/react-router";
import { SettingsIcon } from "lucide-react";

import { useSaveStatus, useSaveTracker } from "@/lib/save-tracker";

import { QuizTitleField } from "./quiz-title-field";
import { SaveStatus } from "./save-status";

/**
 * Editor header (spec 003): brand, title, Configurações, save status and
 * Sair. The Salvar of the playable version arrives with spec 006.
 */
export function EditorHeader({
	title,
	onSaveTitle,
	onOpenSettings,
	onExit,
}: {
	title: string | null;
	onSaveTitle: (title: string | null) => Promise<unknown>;
	onOpenSettings: () => void;
	onExit: () => void;
}) {
	const tracker = useSaveTracker();
	const status = useSaveStatus();

	return (
		<header className="flex h-14 shrink-0 items-center gap-2 border-border border-b bg-card px-3 sm:gap-4 sm:px-4">
			<Link
				to="/"
				className="shrink-0 font-black text-brand text-xl tracking-tight"
			>
				Quizio
			</Link>

			<div className="flex min-w-0 items-center rounded-md border border-input bg-card pr-1">
				<QuizTitleField initialTitle={title} onSave={onSaveTitle} />
				<Button
					variant="secondary"
					size="sm"
					onClick={async () => {
						// The dialog starts from the saved title, never a stale one.
						await tracker.flush();
						onOpenSettings();
					}}
				>
					<SettingsIcon data-icon="inline-start" className="sm:hidden" />
					<span className="max-sm:sr-only">Configurações</span>
				</Button>
			</div>

			<SaveStatus status={status} onRetry={() => void tracker.retry()} />

			<div className="ml-auto flex items-center gap-2">
				<Button
					variant="secondary"
					onClick={async () => {
						// Nothing typed is lost on the way out (RN-23).
						if (await tracker.flush()) {
							onExit();
						}
					}}
				>
					Sair
				</Button>
			</div>
		</header>
	);
}
