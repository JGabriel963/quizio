import { Button } from "@quizio/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@quizio/ui/components/dialog";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@quizio/ui/components/tabs";
import { cn } from "@quizio/ui/lib/utils";
import { ChevronDownIcon } from "lucide-react";
import {
	type KeyboardEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

import { SYMBOL_TABS, type SymbolTab } from "@/lib/symbol-catalog";
import { gridMoveTarget } from "@/lib/symbol-grid";

/** How many columns the grid lays out now (it has fewer on a phone). */
function columnsOf(grid: HTMLElement): number {
	const columns = getComputedStyle(grid)
		.gridTemplateColumns.split(" ")
		.filter((column) => column !== "").length;
	return columns > 0 ? columns : 10;
}

/**
 * One tab's symbols: a grid that scrolls when it does not fit, with one stop
 * for Tab and the arrows inside it (RN-17). While there is more below, the
 * lower edge fades and a round button scrolls a page down.
 */
function SymbolGrid({
	tab,
	onPick,
}: {
	tab: SymbolTab;
	onPick: (symbol: string) => void;
}) {
	const grid = useRef<HTMLFieldSetElement>(null);
	const [current, setCurrent] = useState(0);
	const [moreBelow, setMoreBelow] = useState(false);

	const measure = useCallback(() => {
		const box = grid.current;
		setMoreBelow(
			box !== null && box.scrollTop + box.clientHeight < box.scrollHeight - 1,
		);
	}, []);
	useEffect(measure, [measure]);

	const move = (event: KeyboardEvent<HTMLFieldSetElement>) => {
		const box = grid.current;
		const next =
			box &&
			gridMoveTarget(current, event.key, columnsOf(box), tab.symbols.length);
		if (next === null || next === undefined) {
			return;
		}
		event.preventDefault();
		setCurrent(next);
		box?.querySelectorAll("button")[next]?.focus();
	};

	return (
		<div className="relative">
			<fieldset
				ref={grid}
				aria-label={tab.label}
				onKeyDown={move}
				onScroll={measure}
				className={cn(
					"m-0 grid max-h-[min(26rem,55vh)] min-w-0 grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] overflow-y-auto border-0 border-t border-l p-0",
					moreBelow &&
						"mask-[linear-gradient(to_bottom,black_80%,transparent)]",
				)}
			>
				{tab.symbols.map((symbol, index) => (
					<button
						key={symbol}
						type="button"
						tabIndex={index === current ? 0 : -1}
						onFocus={() => setCurrent(index)}
						onClick={() => onPick(symbol)}
						className="flex aspect-square cursor-pointer items-center justify-center border-r border-b font-bold text-2xl text-foreground transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2"
					>
						{symbol}
					</button>
				))}
			</fieldset>
			{moreBelow && (
				<Button
					type="button"
					size="icon"
					aria-label="Ver mais símbolos"
					onClick={() =>
						grid.current?.scrollBy({
							top: grid.current.clientHeight * 0.8,
							behavior: "smooth",
						})
					}
					className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full"
				>
					<ChevronDownIcon />
				</Button>
			)}
		</div>
	);
}

/**
 * "Insira um símbolo" (spec 047, RN-11 to RN-17): five tabs of symbols, the
 * first open; a symbol picked goes to `onPick` and the dialog closes;
 * Cancelar, Esc or a click outside close it with nothing picked.
 */
export function SymbolDialog({
	open,
	onOpenChange,
	onPick,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onPick: (symbol: string) => void;
}) {
	const pick = (symbol: string) => {
		onPick(symbol);
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent showCloseButton={false} className="gap-5 sm:max-w-3xl">
				<DialogHeader className="pr-0">
					<DialogTitle className="text-2xl">Insira um símbolo</DialogTitle>
				</DialogHeader>
				<Tabs defaultValue={SYMBOL_TABS[0]?.id}>
					<TabsList variant="pill" aria-label="Categorias de símbolos">
						{SYMBOL_TABS.map((tab) => (
							<TabsTrigger key={tab.id} variant="pill" value={tab.id}>
								{tab.label}
							</TabsTrigger>
						))}
					</TabsList>
					{SYMBOL_TABS.map((tab) => (
						<TabsContent key={tab.id} value={tab.id}>
							<SymbolGrid tab={tab} onPick={pick} />
						</TabsContent>
					))}
				</Tabs>
				<DialogFooter className="sm:justify-center">
					<Button
						type="button"
						variant="secondary"
						onClick={() => onOpenChange(false)}
					>
						Cancelar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
