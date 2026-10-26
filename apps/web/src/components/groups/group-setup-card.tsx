import { cn } from "@quizio/ui/lib/utils";
import {
	CircleCheckIcon,
	MegaphoneIcon,
	SquareCheckBigIcon,
	UserPlusIcon,
} from "lucide-react";
import { useId } from "react";

import type { GroupViewData } from "@/lib/api-types";

import { ComingSoonAction } from "./coming-soon-action";

const step =
	"relative flex min-h-32 flex-1 flex-col items-center justify-center gap-3 rounded-md border border-border bg-card p-4 font-semibold text-sm shadow-sm";

/**
 * "Configurar seu grupo", only for the admin (spec 034, RN-17): Convidar
 * membros works; Atribuir and Criar publicação come with specs 038 and 036.
 */
export function GroupSetupCard({
	setup,
	onInvite,
	onDismiss,
}: {
	setup: NonNullable<GroupViewData["setup"]>;
	onInvite: () => void;
	onDismiss: () => void;
}) {
	const titleId = useId();

	return (
		<section
			aria-labelledby={titleId}
			className="flex flex-col gap-3 rounded-lg bg-muted/60 p-4"
		>
			<div className="flex items-center justify-between gap-2">
				<h2 id={titleId} className="font-bold text-sm">
					Configurar seu grupo
				</h2>
				<button
					type="button"
					onClick={onDismiss}
					className="text-primary text-sm hover:underline"
				>
					Pular configuração
				</button>
			</div>
			<div className="flex flex-col gap-3 sm:flex-row">
				<button
					type="button"
					onClick={onInvite}
					aria-label={
						setup.invited ? "Convidar membros (feito)" : "Convidar membros"
					}
					className={cn(
						step,
						"transition-shadow hover:shadow-md",
						setup.invited && "bg-muted font-normal",
					)}
				>
					{setup.invited && (
						<CircleCheckIcon
							aria-hidden="true"
							className="absolute top-3 left-3 size-6 fill-success text-white"
						/>
					)}
					<UserPlusIcon
						aria-hidden="true"
						className={cn(
							"size-8",
							setup.invited ? "text-success" : "text-primary",
						)}
					/>
					Convidar membros
				</button>
				<ComingSoonAction
					label="Atribuir"
					icon={<SquareCheckBigIcon className="size-8! text-primary" />}
					className={cn(step, "text-foreground")}
				/>
				<ComingSoonAction
					label="Criar publicação"
					icon={<MegaphoneIcon className="size-8! text-primary" />}
					className={cn(step, "text-foreground")}
				/>
			</div>
		</section>
	);
}
