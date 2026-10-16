import { Button } from "@quizio/ui/components/button";
import { FileQuestionIcon } from "lucide-react";

/**
 * Asked when the chosen pages already hold questions (spec 027, RN-16):
 * take them as they are, or write new ones about the content.
 */
export function ExtractOrGenerateStep({
	onChoose,
}: {
	onChoose: (extract: boolean) => void;
}) {
	return (
		<div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
			<span
				aria-hidden="true"
				className="flex size-20 items-center justify-center rounded-lg bg-answer-red text-white"
			>
				<FileQuestionIcon className="size-10" />
			</span>
			<h2 className="font-bold text-2xl">
				Extrair perguntas e as adicionar ao seu quiz?
			</h2>
			<p className="max-w-xl text-muted-foreground">
				O documento que você selecionou já contém perguntas. Selecione o formato
				de "Extrair perguntas" para as extrair ou gerar novas perguntas.
			</p>
			<div className="flex flex-wrap justify-center gap-3">
				<Button variant="secondary" onClick={() => onChoose(false)}>
					Gerar perguntas
				</Button>
				<Button onClick={() => onChoose(true)}>Extrair perguntas</Button>
			</div>
		</div>
	);
}
