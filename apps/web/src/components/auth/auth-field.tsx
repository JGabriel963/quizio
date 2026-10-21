import { Input } from "@quizio/ui/components/input";
import { Label } from "@quizio/ui/components/label";
import type { AnyFieldApi } from "@tanstack/react-form";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

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
	const [revealed, setRevealed] = useState(false);
	const isPassword = type === "password";

	return (
		<div className="flex flex-col gap-1.5">
			<Label htmlFor={field.name} className="font-bold">
				{label}
			</Label>
			<div className="relative">
				<Input
					id={field.name}
					name={field.name}
					type={isPassword && revealed ? "text" : type}
					autoComplete={autoComplete}
					value={field.state.value}
					onBlur={field.handleBlur}
					onChange={(event) => field.handleChange(event.target.value)}
					aria-invalid={messages.length > 0 || undefined}
					aria-describedby={messages.length > 0 ? errorId : undefined}
					className={isPassword ? "pr-11" : undefined}
				/>
				{isPassword && (
					<button
						type="button"
						aria-label={revealed ? "Ocultar senha" : "Mostrar senha"}
						className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
						onClick={() => setRevealed((value) => !value)}
					>
						{revealed ? (
							<EyeOff aria-hidden="true" className="size-5" />
						) : (
							<Eye aria-hidden="true" className="size-5" />
						)}
					</button>
				)}
			</div>
			{messages.length > 0 && (
				<p id={errorId} className="text-destructive text-sm">
					{messages.join(" ")}
				</p>
			)}
		</div>
	);
}
