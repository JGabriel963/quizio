import {
	characterCount,
	truncateCharacters,
} from "@quizio/core/shared/domain/text-length";
import { Input } from "@quizio/ui/components/input";
import { Label } from "@quizio/ui/components/label";
import { Textarea } from "@quizio/ui/components/textarea";
import { cn } from "@quizio/ui/lib/utils";
import { useId } from "react";

/**
 * A field with Kahoot's countdown of the characters left, counted as the
 * server counts them (`characterCount`), that never takes more than `max`
 * (specs 034 and 035).
 */
export function CountedField({
	label,
	value,
	onChange,
	max,
	multiline = false,
	labelHidden = false,
	placeholder,
	error,
	autoFocus,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	max: number;
	multiline?: boolean;
	/** Only for screen readers, as Kahoot's "Digite seu texto" (spec 038). */
	labelHidden?: boolean;
	placeholder?: string;
	/** The server's refusal, told beside the field. */
	error?: string | null;
	autoFocus?: boolean;
}) {
	const fieldId = useId();
	const counterId = useId();
	const errorId = useId();
	const fieldProps = {
		id: fieldId,
		value,
		autoFocus,
		placeholder,
		"aria-invalid": error ? true : undefined,
		"aria-describedby": error ? `${counterId} ${errorId}` : counterId,
		onChange: (event: { target: { value: string } }) =>
			onChange(truncateCharacters(event.target.value, max)),
	};

	return (
		<div className="grid gap-2">
			<Label htmlFor={fieldId} className={labelHidden ? "sr-only" : undefined}>
				{label}
			</Label>
			<div className="relative">
				{multiline ? (
					<Textarea {...fieldProps} rows={4} className="min-h-24 pb-6" />
				) : (
					<Input {...fieldProps} className="pr-14" />
				)}
				<span
					id={counterId}
					className={cn(
						"pointer-events-none absolute right-3 text-muted-foreground text-sm",
						multiline ? "bottom-2" : "top-1/2 -translate-y-1/2",
					)}
				>
					<span className="sr-only">Caracteres restantes: </span>
					{max - characterCount(value)}
				</span>
			</div>
			{error && (
				<p id={errorId} role="alert" className="text-destructive text-sm">
					{error}
				</p>
			)}
		</div>
	);
}
