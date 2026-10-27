import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@quizio/ui/components/alert-dialog";
import { Button } from "@quizio/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@quizio/ui/components/dialog";
import { Input } from "@quizio/ui/components/input";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@quizio/ui/components/tooltip";
import { CircleHelpIcon } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { groupInviteLink } from "@/lib/group-invite-link";

const RESET_HELP = "Gera um novo link. O link atual deixa de funcionar.";

/**
 * "Convidar usuários": the invite link and Copiar, for whoever may invite, and
 * Redefinir link for the admin only (spec 034, RN-21, RN-24; spec 035, RN-11).
 */
export function InviteDialog({
	open,
	onClose,
	origin,
	code,
	canReset,
	onReset,
}: {
	open: boolean;
	onClose: () => void;
	origin: string;
	/** Null while it loads. */
	code: string | null;
	/** The admin's: resetting drops the link for everybody. */
	canReset: boolean;
	onReset: () => Promise<unknown>;
}) {
	const fieldId = useId();
	const [copied, setCopied] = useState<string | null>(null);
	const [confirming, setConfirming] = useState(false);
	const link = code ? groupInviteLink(origin, code) : "";

	useEffect(() => {
		if (!copied) {
			return;
		}
		const timer = setTimeout(() => setCopied(null), 3000);
		return () => clearTimeout(timer);
	}, [copied]);

	return (
		<>
			<Dialog
				open={open}
				onOpenChange={(next) => {
					if (!next) {
						onClose();
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Convidar usuários</DialogTitle>
					</DialogHeader>
					<div className="grid gap-2">
						<div className="flex items-center justify-between gap-2">
							<label htmlFor={fieldId} className="font-semibold text-sm">
								Compartilhar link de convite
							</label>
							{canReset && (
								<span className="flex items-center gap-1">
									<button
										type="button"
										disabled={!code}
										onClick={() => setConfirming(true)}
										className="text-primary text-sm hover:underline disabled:opacity-50"
									>
										Redefinir link
									</button>
									<Tooltip>
										<TooltipTrigger
											render={
												<button
													type="button"
													aria-label={RESET_HELP}
													className="text-muted-foreground"
												/>
											}
										>
											<CircleHelpIcon className="size-4" />
										</TooltipTrigger>
										<TooltipContent>{RESET_HELP}</TooltipContent>
									</Tooltip>
								</span>
							)}
						</div>
						<div className="flex gap-2">
							<Input
								id={fieldId}
								readOnly
								value={link}
								className="min-w-0 flex-1 truncate bg-muted"
								onFocus={(event) => event.target.select()}
							/>
							<Button
								disabled={!code}
								onClick={() =>
									navigator.clipboard.writeText(link).then(
										() => setCopied("Link copiado"),
										() => setCopied("Não foi possível copiar."),
									)
								}
							>
								Copiar
							</Button>
						</div>
						<p
							aria-live="polite"
							className="min-h-5 text-muted-foreground text-sm"
						>
							{copied ?? ""}
						</p>
					</div>
					<DialogFooter className="sm:justify-center">
						<Button variant="secondary" onClick={onClose}>
							Fechar
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<AlertDialog open={confirming} onOpenChange={setConfirming}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Redefinir o link de convite?</AlertDialogTitle>
						<AlertDialogDescription>
							O link atual deixará de funcionar. Quem já entrou continua no
							grupo.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								setConfirming(false);
								void onReset();
							}}
						>
							Redefinir
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
