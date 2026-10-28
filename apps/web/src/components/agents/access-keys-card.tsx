import { Button } from "@quizio/ui/components/button";
import { useState } from "react";

import { createdLabel, lastUseLabel } from "@/lib/agent-labels";
import type { AccessKeyData } from "@/lib/api-types";

import { ConfirmDialog } from "./confirm-dialog";
import {
	CreateAccessKeyDialog,
	type CreatedAccessKey,
} from "./create-access-key-dialog";

/** Chaves de acesso (spec 044, RN-05, RN-15, RN-16). */
export function AccessKeysCard({
	keys,
	keyLimit,
	now,
	onCreateKey,
	onRevokeKey,
}: {
	keys: AccessKeyData[];
	keyLimit: number;
	now?: Date;
	onCreateKey: (name: string) => Promise<CreatedAccessKey>;
	onRevokeKey: (keyId: string) => Promise<void>;
}) {
	const [creating, setCreating] = useState(false);
	const [revoking, setRevoking] = useState<AccessKeyData | null>(null);
	const full = keys.length >= keyLimit;

	return (
		<section
			aria-labelledby="access-keys-title"
			className="flex flex-col gap-4 rounded-lg bg-card p-6 shadow-sm"
		>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2 id="access-keys-title" className="font-bold text-lg">
					Chaves de acesso
				</h2>
				<Button
					type="button"
					variant="success"
					disabled={full}
					onClick={() => setCreating(true)}
				>
					Criar chave
				</Button>
			</div>
			<p className="text-muted-foreground text-sm">
				Para agentes ou scripts que só aceitam uma chave fixa, enviada no
				cabeçalho Authorization.
			</p>
			{full && (
				<p className="text-sm">
					Você chegou ao limite de {keyLimit} chaves. Revogue uma para criar
					outra.
				</p>
			)}
			{keys.length === 0 ? (
				<p className="text-muted-foreground">Nenhuma chave criada.</p>
			) : (
				<ul className="flex flex-col divide-y">
					{keys.map((key) => (
						<li
							key={key.id}
							className="flex flex-wrap items-center justify-between gap-3 py-3"
						>
							<div className="flex min-w-0 flex-col">
								<span className="truncate font-semibold">{key.name}</span>
								<code className="font-mono text-muted-foreground text-xs">
									{key.start}…
								</code>
								<span className="text-muted-foreground text-sm">
									{createdLabel(new Date(key.createdAt))}
								</span>
								<span className="text-muted-foreground text-sm">
									{lastUseLabel(
										key.lastUsedAt ? new Date(key.lastUsedAt) : null,
										now,
									)}
								</span>
							</div>
							<Button
								type="button"
								variant="outline"
								size="sm"
								aria-label={`Revogar ${key.name}`}
								onClick={() => setRevoking(key)}
							>
								Revogar
							</Button>
						</li>
					))}
				</ul>
			)}
			<CreateAccessKeyDialog
				open={creating}
				onClose={() => setCreating(false)}
				onCreate={onCreateKey}
			/>
			<ConfirmDialog
				open={revoking !== null}
				title={`Revogar ${revoking?.name ?? ""}?`}
				description="Os agentes que usam esta chave perdem o acesso na hora."
				action="Revogar"
				failure="Não foi possível revogar a chave."
				onConfirm={() => onRevokeKey(revoking?.id ?? "")}
				onClose={() => setRevoking(null)}
			/>
		</section>
	);
}
