import { Input } from "@quizio/ui/components/input";
import { SearchIcon } from "lucide-react";
import { useEffect, useEffectEvent, useState } from "react";

const SEARCH_DEBOUNCE_MS = 300;

/** Search box that reports changes after the user pauses typing. */
export function LibrarySearch({
	value,
	onSearch,
}: {
	value: string;
	onSearch: (value: string) => void;
}) {
	const [text, setText] = useState(value);
	const reportSearch = useEffectEvent(onSearch);

	// Follow external changes, e.g. switching library sections clears the search.
	useEffect(() => {
		setText(value);
	}, [value]);

	useEffect(() => {
		if (text === value) {
			return;
		}
		const timer = setTimeout(() => reportSearch(text), SEARCH_DEBOUNCE_MS);
		return () => clearTimeout(timer);
	}, [text, value]);

	return (
		<div className="relative w-full sm:max-w-sm">
			<SearchIcon
				aria-hidden="true"
				className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
			/>
			<Input
				type="search"
				aria-label="Pesquisar quizzes"
				placeholder="Pesquisar"
				value={text}
				onChange={(event) => setText(event.target.value)}
				className="pl-9"
			/>
		</div>
	);
}
