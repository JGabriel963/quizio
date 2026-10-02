import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@quizio/ui/components/alert-dialog";
import { WifiOffIcon } from "lucide-react";

import type { ConnectionWatch } from "@/lib/use-connection-watch";

/**
 * "Conexão perdida" over the host's screen (spec 013, RN-05 to RN-08). It
 * cannot be closed: it goes away by itself when the server answers again.
 * Unlike Kahoot's, it does not forbid a reload: the game lives on the server.
 */
export function ConnectionLostDialog({
	watch,
}: {
	watch: Pick<
		ConnectionWatch,
		"lost" | "retrying" | "retryInSeconds" | "retryNow"
	>;
}) {
	const { retryInSeconds: seconds } = watch;

	return (
		// No `onOpenChange`: Escape and a click outside ask to close, and nobody answers.
		<AlertDialog open={watch.lost}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Conexão perdida</AlertDialogTitle>
					<AlertDialogDescription>
						Vamos tentar reconectar automaticamente. O jogo continua de onde
						parou assim que a conexão voltar.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<WifiOffIcon
					aria-hidden="true"
					className="mx-auto size-16 text-brand motion-safe:animate-pulse"
				/>
				<div className="flex flex-col gap-2 text-sm">
					<p className="text-muted-foreground">
						Se não reconectar, verifique a sua internet e clique em Reconectar.
					</p>
					<p role="status" className="font-semibold">
						{watch.retrying
							? "Reconectando…"
							: `Tentando novamente em ${seconds} ${seconds === 1 ? "segundo" : "segundos"}…`}
					</p>
				</div>
				<AlertDialogFooter className="sm:justify-center">
					<AlertDialogAction onClick={watch.retryNow}>
						Reconectar
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
