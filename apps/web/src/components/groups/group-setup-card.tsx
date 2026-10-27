import { cn } from "@quizio/ui/lib/utils";
import {
	CircleCheckIcon,
	type LucideIcon,
	MegaphoneIcon,
	SquareCheckBigIcon,
	UserPlusIcon,
} from "lucide-react";
import { useId } from "react";

import type { GroupViewData } from "@/lib/api-types";

const step =
	"relative flex min-h-32 flex-1 flex-col items-center justify-center gap-3 rounded-md border border-border bg-card p-4 font-semibold text-sm shadow-sm";

function DoneMark() {
	return (
		<CircleCheckIcon
			data-testid="setup-done"
			aria-hidden="true"
			className="absolute top-3 left-3 size-6 fill-success text-white"
		/>
	);
}

function StepButton({
	label,
	icon: Icon,
	done,
	onClick,
}: {
	label: string;
	icon: LucideIcon;
	done: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={done ? `${label} (feito)` : label}
			className={cn(
				step,
				"transition-shadow hover:shadow-md",
				done && "bg-muted font-normal",
			)}
		>
			{done && <DoneMark />}
			<Icon
				aria-hidden="true"
				className={cn("size-8", done ? "text-success" : "text-primary")}
			/>
			{label}
		</button>
	);
}

/**
 * "Configurar seu grupo", only for the admin (spec 034, RN-17): Convidar
 * membros, Atribuir (spec 038) and Criar publicação (spec 036), each done
 * once the group has it (spec 038, RN-29).
 */
export function GroupSetupCard({
	setup,
	onInvite,
	onAssign,
	onCreatePost,
	onDismiss,
}: {
	setup: NonNullable<GroupViewData["setup"]>;
	onInvite: () => void;
	onAssign: () => void;
	onCreatePost: () => void;
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
				<StepButton
					label="Convidar membros"
					icon={UserPlusIcon}
					done={setup.invited}
					onClick={onInvite}
				/>
				<StepButton
					label="Atribuir"
					icon={SquareCheckBigIcon}
					done={setup.assigned}
					onClick={onAssign}
				/>
				<StepButton
					label="Criar publicação"
					icon={MegaphoneIcon}
					done={setup.posted}
					onClick={onCreatePost}
				/>
			</div>
		</section>
	);
}
