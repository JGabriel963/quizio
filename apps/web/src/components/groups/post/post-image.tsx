import {
	Dialog,
	DialogContent,
	DialogTitle,
} from "@quizio/ui/components/dialog";
import { useState } from "react";

/**
 * A posted image at the post's width, whole and with a limited height; a
 * click opens it enlarged over the page, closed by Fechar or Esc (spec 036,
 * RN-10).
 */
export function PostImage({ url, alt }: { url: string; alt: string }) {
	const [enlarged, setEnlarged] = useState(false);

	return (
		<>
			<button
				type="button"
				aria-label="Ampliar a imagem"
				onClick={() => setEnlarged(true)}
				className="flex justify-center overflow-hidden rounded-md bg-muted"
			>
				<img
					src={url}
					alt={alt}
					loading="lazy"
					className="max-h-[28rem] w-full object-contain"
				/>
			</button>
			<Dialog open={enlarged} onOpenChange={setEnlarged}>
				<DialogContent className="max-h-[95vh] max-w-[95vw] bg-black p-2 sm:max-w-[95vw]">
					<DialogTitle className="sr-only">{alt}</DialogTitle>
					<img
						src={url}
						alt={alt}
						className="max-h-[88vh] w-full object-contain"
					/>
				</DialogContent>
			</Dialog>
		</>
	);
}
