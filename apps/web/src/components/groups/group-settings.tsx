import type {
	GroupPermission,
	GroupPermissions,
} from "@quizio/core/groups/domain/group-permissions";
import { Button } from "@quizio/ui/components/button";
import { Switch } from "@quizio/ui/components/switch";
import {
	EyeIcon,
	InfoIcon,
	type LucideIcon,
	UserIcon,
	UserPlusIcon,
} from "lucide-react";
import { type ReactNode, useEffect, useId, useState } from "react";

const SAVE_FAILED = "Não foi possível salvar a configuração.";

/** The switches, with Kahoot's texts, by section (spec 035, RN-03). */
const SECTIONS: readonly {
	title: string;
	rows: readonly {
		permission: GroupPermission;
		icon: LucideIcon;
		title: string;
		explanation: string;
	}[];
}[] = [
	{
		title: "Pessoas",
		rows: [
			{
				permission: "membersCanInvite",
				icon: UserPlusIcon,
				title: "Os membros podem convidar outras pessoas",
				explanation:
					"Permitir que os membros convidem novas pessoas para participar.",
			},
			{
				permission: "membersCanSeeMembers",
				icon: EyeIcon,
				title: "Os membros podem ver quem está no grupo",
				explanation: "A lista de membros ficará visível para todos no grupo.",
			},
		],
	},
	{
		title: "Conteúdo compartilhado",
		rows: [
			{
				permission: "membersCanShare",
				icon: UserIcon,
				title: "Os membros podem compartilhar conteúdo",
				explanation:
					"Permite que os membros compartilhem conteúdos e pastas com o grupo. Caso a opção seja desativada, somente os administradores poderão compartilhar conteúdo.",
			},
		],
	},
	{
		title: "Atividades atribuídas",
		rows: [
			{
				permission: "membersCanAssign",
				icon: UserIcon,
				title: "Os membros podem criar atividades",
				explanation:
					"Permite que os membros atribuam conteúdos ao grupo. Quando essa opção é desativada, só os administradores podem fazer as atribuições.",
			},
		],
	},
];

function Section({ title, children }: { title: string; children: ReactNode }) {
	const titleId = useId();
	return (
		<section
			aria-labelledby={titleId}
			className="flex flex-col gap-4 border-border border-b py-5 first:pt-0 last:border-b-0 last:pb-0"
		>
			<h2 id={titleId} className="font-bold text-sm">
				{title}
			</h2>
			{children}
		</section>
	);
}

function RowIcon({ icon: Icon }: { icon: LucideIcon }) {
	return (
		<span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
			<Icon aria-hidden="true" className="size-5" />
		</span>
	);
}

/**
 * "Configurações do grupo" (spec 035): the name and description line and the
 * four switches. A switch changes at once and goes back, with a warning, when
 * the server did not take it (RN-09).
 */
export function GroupSettingsPanel({
	settings,
	onToggle,
	onEditDetails,
}: {
	settings: { permissions: GroupPermissions };
	onToggle: (permission: GroupPermission, value: boolean) => Promise<unknown>;
	onEditDetails: () => void;
}) {
	const [values, setValues] = useState(settings.permissions);
	const [failed, setFailed] = useState(false);

	// A refetch brings what the server has.
	useEffect(() => {
		setValues(settings.permissions);
	}, [settings.permissions]);

	async function toggle(permission: GroupPermission, value: boolean) {
		setFailed(false);
		setValues((current) => ({ ...current, [permission]: value }));
		try {
			await onToggle(permission, value);
		} catch {
			setValues((current) => ({ ...current, [permission]: !value }));
			setFailed(true);
		}
	}

	return (
		<div className="flex flex-col rounded-lg bg-card p-4 shadow-sm sm:p-6">
			<Section title="Personalizar grupo">
				<div className="flex items-start gap-4">
					<RowIcon icon={InfoIcon} />
					<div className="flex min-w-0 flex-1 flex-col gap-0.5">
						<p className="font-bold text-sm">Nome e descrição</p>
						<p className="text-muted-foreground text-sm">
							Fale um pouco sobre o seu grupo.
						</p>
					</div>
					<Button size="sm" onClick={onEditDetails}>
						Editar
					</Button>
				</div>
			</Section>
			{SECTIONS.map((section) => (
				<Section key={section.title} title={section.title}>
					{section.rows.map((row) => (
						<SwitchRow
							key={row.permission}
							icon={row.icon}
							title={row.title}
							explanation={row.explanation}
							checked={values[row.permission]}
							onChange={(value) => void toggle(row.permission, value)}
						/>
					))}
				</Section>
			))}
			{failed && (
				<p role="alert" className="pt-4 font-semibold text-destructive text-sm">
					{SAVE_FAILED}
				</p>
			)}
		</div>
	);
}

function SwitchRow({
	icon,
	title,
	explanation,
	checked,
	onChange,
}: {
	icon: LucideIcon;
	title: string;
	explanation: string;
	checked: boolean;
	onChange: (value: boolean) => void;
}) {
	const titleId = useId();
	const explanationId = useId();
	return (
		<div className="flex items-start gap-4">
			<RowIcon icon={icon} />
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<p id={titleId} className="font-bold text-sm">
					{title}
				</p>
				<p id={explanationId} className="text-muted-foreground text-sm">
					{explanation}
				</p>
			</div>
			<Switch
				aria-labelledby={titleId}
				aria-describedby={explanationId}
				checked={checked}
				// The primitive also passes the event: the caller gets only the value.
				onCheckedChange={(next) => onChange(next)}
			/>
		</div>
	);
}
