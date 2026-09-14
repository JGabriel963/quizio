import { Input } from "@quizio/ui/components/input";
import { Label } from "@quizio/ui/components/label";
import type { AnyFieldApi } from "@tanstack/react-form";

/** Labeled input bound to a TanStack Form field, with its validation messages. */
export function AuthField({
	field,
	label,
	type = "text",
	autoComplete,
}: {
	field: AnyFieldApi;
	label: string;
	type?: "text" | "email" | "password";
	autoComplete?: string;
}) {
	const messages = [
		...new Set(
			field.state.meta.errors
				.map((error: { message?: string } | string | undefined) =>
					typeof error === "string" ? error : error?.message,
				)
				.filter(Boolean),
		),
	];
	const errorId = `${field.name}-error`;

	return (
		<div className="flex flex-col gap-1.5">
			<Label htmlFor={field.name}>{label}</Label>
			<Input
				id={field.name}
				name={field.name}
				type={type}
				autoComplete={autoComplete}
				value={field.state.value}
				onBlur={field.handleBlur}
				onChange={(event) => field.handleChange(event.target.value)}
				aria-invalid={messages.length > 0 || undefined}
				aria-describedby={messages.length > 0 ? errorId : undefined}
			/>
			{messages.length > 0 && (
				<p id={errorId} className="text-destructive text-sm">
					{messages.join(" ")}
				</p>
			)}
		</div>
	);
}
