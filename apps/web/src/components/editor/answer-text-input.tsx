import { cn } from "@quizio/ui/lib/utils";
import type { ComponentProps } from "react";

/** An answer is one line: a line break typed or pasted becomes a space. */
export function oneLine(text: string): string {
	return text.replace(/\s*[\r\n]+\s*/g, " ");
}

/**
 * An answer's text in the editor. It wraps and makes its block taller instead
 * of hiding what does not fit in one line, as Kahoot shows the whole answer.
 * An invisible copy of the text sits in the same grid cell and gives the field
 * its height, so it follows the text and the width without measuring.
 */
export function AnswerTextInput({
	value,
	onValueChange,
	placeholder,
	className,
	onKeyDown,
	...props
}: Omit<ComponentProps<"textarea">, "value" | "onChange" | "rows"> & {
	value: string;
	onValueChange: (value: string) => void;
	placeholder: string;
}) {
	return (
		<div className={cn("grid min-w-0 flex-1 grid-cols-1", className)}>
			<span
				aria-hidden="true"
				className="wrap-break-word invisible col-start-1 row-start-1 whitespace-pre-wrap"
			>
				{`${value || placeholder} `}
			</span>
			<textarea
				{...props}
				rows={1}
				placeholder={placeholder}
				value={value}
				onChange={(event) => onValueChange(oneLine(event.target.value))}
				onKeyDown={(event) => {
					if (event.key === "Enter" && !event.nativeEvent.isComposing) {
						event.preventDefault();
					}
					onKeyDown?.(event);
				}}
				className="col-start-1 row-start-1 resize-none overflow-hidden bg-transparent outline-none placeholder:text-muted-foreground"
			/>
		</div>
	);
}
