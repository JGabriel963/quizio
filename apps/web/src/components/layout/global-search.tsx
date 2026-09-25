import { Input } from "@quizio/ui/components/input";
import { SearchIcon } from "lucide-react";
import { type FormEvent, useState } from "react";

/**
 * Top bar search. It only searches the creator's own library (spec 002,
 * RN-10/RN-12); public content arrives with the discovery feature.
 */
export function GlobalSearch({
	onSearch,
}: {
	onSearch: (search: string) => void;
}) {
	const [text, setText] = useState("");

	const submit = (event: FormEvent) => {
		event.preventDefault();
		const search = text.trim();
		// Nothing to search means nothing to do (RN-11).
		if (search === "") {
			return;
		}
		onSearch(search);
	};

	return (
		<form onSubmit={submit} className="w-full max-w-xl">
			<div className="relative">
				<SearchIcon
					aria-hidden="true"
					className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
				/>
				<Input
					type="search"
					aria-label="Pesquisar nos meus quizzes"
					placeholder="Pesquisar nos meus quizzes"
					value={text}
					onChange={(event) => setText(event.target.value)}
					className="pl-9"
				/>
			</div>
		</form>
	);
}
