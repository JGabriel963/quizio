import { Button } from "@quizio/ui/components/button";
import { cn } from "@quizio/ui/lib/utils";
import { CheckIcon, CloudOffIcon, LoaderCircleIcon } from "lucide-react";

import type { SaveStatus as SaveStatusValue } from "@/lib/save-tracker";

/** Header indicator of the autosave (spec 003, RN-21). */
export function SaveStatus({
	status,
	onRetry,
}: {
	status: SaveStatusValue;
	onRetry: () => void;
}) {
	return (
		<div
			role="status"
			className={cn(
				"flex items-center gap-1.5 font-semibold text-sm",
				status === "failed" ? "text-destructive" : "text-muted-foreground",
			)}
		>
			{status === "saving" && (
				<>
					<LoaderCircleIcon
						aria-hidden="true"
						className="size-4 animate-spin"
					/>
					Salvando…
				</>
			)}
			{status === "saved" && (
				<>
					<CheckIcon aria-hidden="true" className="size-4" />
					Salvo
				</>
			)}
			{status === "failed" && (
				<>
					<CloudOffIcon aria-hidden="true" className="size-4" />
					Não foi possível salvar
					<Button variant="link" size="sm" className="px-1" onClick={onRetry}>
						Tentar de novo
					</Button>
				</>
			)}
		</div>
	);
}
