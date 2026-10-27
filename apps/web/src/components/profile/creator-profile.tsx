import { Button } from "@quizio/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@quizio/ui/components/dropdown-menu";
import { Link } from "@tanstack/react-router";
import {
	CircleHelpIcon,
	EllipsisVerticalIcon,
	LinkIcon,
	PencilIcon,
	UsersIcon,
} from "lucide-react";

import { UserAvatar } from "@/components/account/user-avatar";
import { QuizCover } from "@/components/quiz/quiz-cover";
import type { CreatorProfileData } from "@/lib/api-types";
import { questionCountLabel } from "@/lib/quiz-labels";

/**
 * A creator's profile (spec 039, RN-27 to RN-33): the photo, the name,
 * Opções de perfil and the totals, then the public quizzes' cards.
 */
export function CreatorProfile({
	profile,
	onCopyLink,
}: {
	profile: CreatorProfileData;
	onCopyLink: () => void;
}) {
	const { creator, isOwner, totals } = profile;
	return (
		<div className="flex flex-col gap-8">
			<header className="flex flex-wrap items-center gap-x-8 gap-y-4">
				<div className="flex min-w-0 flex-1 items-center gap-4">
					<UserAvatar
						userId={creator.userId}
						photoUrl={creator.photoUrl}
						size="xl"
						className="size-16"
					/>
					<h1 className="truncate font-bold text-2xl">{creator.name}</h1>
				</div>
				<div className="flex items-center gap-2 text-muted-foreground text-sm">
					<span>Opções de perfil</span>
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button
									variant="ghost"
									size="icon"
									aria-label="Opções de perfil"
									className="rounded-full bg-card"
								/>
							}
						>
							<EllipsisVerticalIcon />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={onCopyLink}>
								<LinkIcon />
								Copiar link do perfil
							</DropdownMenuItem>
							{isOwner && (
								<DropdownMenuItem
									render={
										<Link to="/settings" search={{ section: "profile" }} />
									}
								>
									<PencilIcon />
									Editar perfil
								</DropdownMenuItem>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
				<ul aria-label="Números do perfil" className="flex gap-8">
					{(
						[
							["Quizzes", totals.quizzes],
							["Jogos", totals.games],
							["Participantes", totals.participants],
						] as const
					).map(([label, value]) => (
						<li key={label} className="flex flex-col gap-1">
							<span className="text-muted-foreground text-sm">{label}</span>
							<span className="font-bold">{value}</span>
						</li>
					))}
				</ul>
			</header>

			{profile.quizzes.length === 0 ? (
				<p className="py-12 text-center text-muted-foreground">
					{isOwner
						? "Você ainda não tem quizzes públicos. Mude a visibilidade de um quiz para Público para que ele apareça aqui."
						: `${creator.name} ainda não tem quizzes públicos.`}
				</p>
			) : (
				<ul className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4">
					{profile.quizzes.map((quiz) => (
						<li key={quiz.quizId}>
							<Link
								{...(isOwner
									? {
											to: "/quizzes/$quizId",
											params: { quizId: quiz.quizId },
										}
									: {
											to: "/profile/$userId/quizzes/$quizId",
											params: {
												userId: creator.userId,
												quizId: quiz.quizId,
											},
										})}
								className="flex h-full flex-col overflow-hidden rounded-lg bg-card shadow-sm outline-none transition-shadow hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50"
							>
								<div className="flex items-center gap-1 px-3 py-1.5 font-semibold text-xs">
									<CircleHelpIcon aria-hidden="true" className="size-3.5" />
									Quiz
								</div>
								<div className="relative">
									<QuizCover
										url={quiz.coverUrl}
										className="aspect-video w-full"
									/>
									<div className="absolute right-2 bottom-2 flex gap-1 text-xs">
										<span className="inline-flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-white">
											<UsersIcon aria-hidden="true" className="size-3" />
											<span className="sr-only">
												{quiz.participants}{" "}
												{quiz.participants === 1
													? "participante"
													: "participantes"}
											</span>
											<span aria-hidden="true">{quiz.participants}</span>
										</span>
										<span className="rounded bg-black/70 px-1.5 py-0.5 text-white">
											{questionCountLabel(quiz.questionCount)}
										</span>
									</div>
								</div>
								<div className="flex flex-1 flex-col gap-2 p-3">
									<p className="line-clamp-2 font-bold">{quiz.title}</p>
									<p className="mt-auto truncate text-muted-foreground text-xs">
										{creator.name}
									</p>
								</div>
							</Link>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
