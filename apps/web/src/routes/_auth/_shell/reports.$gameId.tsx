import {
	Sheet,
	SheetBody,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@quizio/ui/components/sheet";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { ShareAssignmentDialog } from "@/components/assignment/share-assignment-dialog";
import { ChangeDeadlineDialog } from "@/components/reports/change-deadline-dialog";
import { EndAssignmentDialog } from "@/components/reports/end-assignment-dialog";
import { ParticipantDetail } from "@/components/reports/participant-detail";
import { ParticipantsTable } from "@/components/reports/participants-table";
import { QuestionDetail } from "@/components/reports/question-detail";
import { QuestionsTable } from "@/components/reports/questions-table";
import { ReportHeader } from "@/components/reports/report-header";
import { REPORT_TABS, REPORT_VIEWS } from "@/components/reports/report-parts";
import {
	DetailState,
	ReportLoadError,
	ReportNotFound,
	ReportSkeleton,
	ReportTrashed,
} from "@/components/reports/report-states";
import { ReportSummary } from "@/components/reports/report-summary";
import { useAssignmentMutations } from "@/lib/assignment-mutations";
import { usePlayAgain } from "@/lib/game-mutations";
import { isReportInTrash, isReportNotFound } from "@/lib/report-error-messages";
import { useReportMutations } from "@/lib/report-mutations";
import { reportRefreshInterval } from "@/lib/report-refresh";
import { useOrigin } from "@/lib/use-origin";
import { useTRPC } from "@/utils/trpc";

/** The tab, the list inside it and the open detail are all in the address (RN-33). */
const reportSearchSchema = z.object({
	tab: z.enum(REPORT_TABS).catch("summary").default("summary"),
	view: z.enum(REPORT_VIEWS).catch("all").default("all"),
	participant: z.string().optional(),
	question: z.number().int().min(0).optional().catch(undefined),
});

export const Route = createFileRoute("/_auth/_shell/reports/$gameId")({
	validateSearch: reportSearchSchema,
	component: ReportPage,
});

/** A refusal is the report's state, not a failure to try again. */
const isRefusal = (error: unknown) =>
	isReportInTrash(error) || isReportNotFound(error);

function ReportPage() {
	const { gameId } = Route.useParams();
	const { tab, view, participant, question } = Route.useSearch();
	const { session } = Route.useRouteContext();
	const navigate = Route.useNavigate();
	const trpc = useTRPC();
	const mutations = useReportMutations();
	const assignmentMutations = useAssignmentMutations();
	const playAgain = usePlayAgain();
	const origin = useOrigin();
	/** Which dialog of an open assignment is up (spec 029), and since when. */
	const [assignmentDialog, setAssignmentDialog] = useState<{
		kind: "share" | "deadline" | "end";
		openedAt: Date;
	} | null>(null);
	const assignmentSetup = useQuery({
		...trpc.game.assignment.setup.queryOptions(),
		enabled: assignmentDialog?.kind === "deadline",
	});
	const report = useQuery({
		...trpc.report.get.queryOptions({ gameId }),
		// Participants play an open assignment meanwhile (spec 030, RN-28).
		refetchInterval: (query) => reportRefreshInterval(query.state.data),
		retry: (failureCount, error) => !isRefusal(error) && failureCount < 2,
		meta: { suppressErrorToast: true },
	});
	const participantDetail = useQuery({
		...trpc.report.participant.queryOptions({
			gameId,
			playerId: participant ?? "",
		}),
		enabled: report.isSuccess && participant !== undefined,
		meta: { suppressErrorToast: true },
	});
	const questionDetail = useQuery({
		...trpc.report.question.queryOptions({
			gameId,
			questionIndex: question ?? 0,
		}),
		enabled: report.isSuccess && question !== undefined,
		meta: { suppressErrorToast: true },
	});

	const backToReports = (
		<Link
			to="/reports"
			search={{ section: "reports" }}
			className="inline-flex items-center gap-1 self-start font-semibold text-muted-foreground text-sm hover:text-foreground"
		>
			<ArrowLeftIcon aria-hidden="true" className="size-4" />
			Voltar para os relatórios
		</Link>
	);

	const closeDetail = () =>
		navigate({
			search: (current) => ({
				...current,
				participant: undefined,
				question: undefined,
			}),
		});

	return (
		<div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
			{backToReports}

			{report.isPending ? (
				<ReportSkeleton />
			) : report.isError ? (
				isReportInTrash(report.error) ? (
					<ReportTrashed
						restoring={mutations.restore.isPending}
						onRestore={() => mutations.restore.mutate({ gameIds: [gameId] })}
					/>
				) : isReportNotFound(report.error) ? (
					<ReportNotFound />
				) : (
					<ReportLoadError onRetry={() => report.refetch()} />
				)
			) : (
				<>
					<ReportHeader
						header={report.data.header}
						hostName={session.user.name}
						tab={tab}
						onRename={(name) => mutations.rename.mutateAsync({ gameId, name })}
						onMoveToTrash={() =>
							mutations.moveToTrash.mutate(
								{ gameIds: [gameId] },
								{
									onSuccess: () =>
										navigate({
											to: "/reports",
											search: { section: "reports" },
										}),
								},
							)
						}
					/>

					{tab === "summary" && (
						<ReportSummary
							header={report.data.header}
							summary={report.data.summary}
							playAgain={{
								pending: playAgain.pending,
								error: playAgain.error,
								start: () => {
									const { quizId } = report.data.header;
									if (quizId) {
										playAgain.start(quizId);
									}
								},
							}}
							assignmentActions={{
								origin,
								onShare: () =>
									setAssignmentDialog({ kind: "share", openedAt: new Date() }),
								onChangeDeadline: () =>
									setAssignmentDialog({
										kind: "deadline",
										openedAt: new Date(),
									}),
								onEnd: () =>
									setAssignmentDialog({ kind: "end", openedAt: new Date() }),
							}}
						/>
					)}
					{report.data.header.assignment?.open && origin && (
						<>
							<ShareAssignmentDialog
								open={assignmentDialog?.kind === "share"}
								onOpenChange={(open) => !open && setAssignmentDialog(null)}
								origin={origin}
								assignment={{
									gameId,
									name: report.data.header.name,
									pin: report.data.header.assignment.pin ?? "",
									deadline: report.data.header.assignment.deadline,
									remainingMs: report.data.header.assignment.remainingMs ?? 0,
									participantCount: report.data.header.participantCount,
								}}
							/>
							{assignmentDialog?.kind === "deadline" && (
								<ChangeDeadlineDialog
									open
									onOpenChange={(open) => !open && setAssignmentDialog(null)}
									deadline={new Date(report.data.header.assignment.deadline)}
									now={assignmentDialog.openedAt}
									maxDays={assignmentSetup.data?.maxDeadlineDays ?? 28}
									onSave={async (deadline) => {
										await assignmentMutations.changeDeadline.mutateAsync({
											gameId,
											deadline: deadline.toISOString(),
										});
									}}
								/>
							)}
							<EndAssignmentDialog
								open={assignmentDialog?.kind === "end"}
								onCancel={() => setAssignmentDialog(null)}
								onConfirm={() => {
									setAssignmentDialog(null);
									assignmentMutations.end.mutate({ gameId });
								}}
							/>
						</>
					)}
					{tab === "participants" && (
						<ParticipantsTable
							// Another list starts from its first lines.
							key={view}
							gameId={gameId}
							participants={report.data.participants}
							view={view}
						/>
					)}
					{tab === "questions" && (
						<QuestionsTable
							key={view}
							gameId={gameId}
							questions={report.data.questions}
							view={view}
						/>
					)}

					<Sheet
						open={participant !== undefined}
						onOpenChange={(open) => {
							if (!open) {
								closeDetail();
							}
						}}
					>
						<SheetContent className="sm:max-w-xl">
							<SheetHeader>
								<SheetTitle>
									{participantDetail.data?.nickname ??
										report.data.participants.find(
											(row) => row.playerId === participant,
										)?.nickname ??
										"Participante"}
								</SheetTitle>
								<SheetDescription>
									As respostas deste participante, pergunta a pergunta.
								</SheetDescription>
							</SheetHeader>
							<SheetBody>
								<DetailState
									state={
										participantDetail.isSuccess
											? "ready"
											: participantDetail.isError
												? "error"
												: "pending"
									}
									onRetry={() => participantDetail.refetch()}
								>
									{participantDetail.data && (
										<ParticipantDetail detail={participantDetail.data} />
									)}
								</DetailState>
							</SheetBody>
						</SheetContent>
					</Sheet>

					<Sheet
						open={question !== undefined}
						onOpenChange={(open) => {
							if (!open) {
								closeDetail();
							}
						}}
					>
						<SheetContent className="sm:max-w-xl">
							<SheetHeader>
								<SheetTitle>
									Pergunta {question !== undefined ? question + 1 : ""}
								</SheetTitle>
								<SheetDescription>
									Como o grupo respondeu a esta pergunta.
								</SheetDescription>
							</SheetHeader>
							<SheetBody>
								<DetailState
									state={
										questionDetail.isSuccess
											? "ready"
											: questionDetail.isError
												? "error"
												: "pending"
									}
									onRetry={() => questionDetail.refetch()}
								>
									{questionDetail.data && (
										<QuestionDetail detail={questionDetail.data} />
									)}
								</DetailState>
							</SheetBody>
						</SheetContent>
					</Sheet>
				</>
			)}
		</div>
	);
}
