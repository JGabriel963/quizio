import { Button } from "@quizio/ui/components/button";
import { Sheet, SheetContent, SheetTitle } from "@quizio/ui/components/sheet";
import { ArrowLeftIcon, ArrowRightIcon, XIcon } from "lucide-react";
import { useState } from "react";

import { QuizDetailsPanel } from "./quiz-details-panel";

/**
 * The quiz's page as Kahoot opens it from the library: a drawer up from the
 * bottom, over the list, while the address bar shows `/quizzes/{id}` (a
 * masked route), so a reload or a shared link opens the page itself. The
 * arrows go to the quiz before and after in the list.
 */
export function QuizDrawer({
	quizId,
	onClose,
	onPrevious,
	onNext,
}: {
	/** Null closes the drawer. */
	quizId: string | null;
	onClose: () => void;
	/** Absent at the start (or the end) of the list. */
	onPrevious?: () => void;
	onNext?: () => void;
}) {
	// The drawer keeps showing its quiz while it slides away.
	const [shownId, setShownId] = useState(quizId);
	if (quizId !== null && quizId !== shownId) {
		setShownId(quizId);
	}

	return (
		<Sheet
			open={quizId !== null}
			onOpenChange={(open) => {
				if (!open) {
					onClose();
				}
			}}
		>
			<SheetContent side="bottom" showCloseButton={false}>
				<SheetTitle className="sr-only">Detalhes do quiz</SheetTitle>
				<div className="min-h-0 flex-1 overflow-y-auto bg-card">
					{shownId && (
						<QuizDetailsPanel
							// A new quiz is a new page: its toggles start over.
							key={shownId}
							quizId={shownId}
							onDeleted={onClose}
							navigation={
								<div className="flex shrink-0 items-center gap-1">
									<Button
										variant="secondary"
										size="icon"
										aria-label="Quiz anterior"
										disabled={!onPrevious}
										onClick={onPrevious}
									>
										<ArrowLeftIcon />
									</Button>
									<Button
										variant="secondary"
										size="icon"
										aria-label="Próximo quiz"
										disabled={!onNext}
										onClick={onNext}
									>
										<ArrowRightIcon />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										aria-label="Fechar"
										onClick={onClose}
									>
										<XIcon />
									</Button>
								</div>
							}
						/>
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}
