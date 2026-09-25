/** Opens the dashboard with the creator's name (spec 002, RN-14). */
export function HomeGreeting({ name }: { name: string }) {
	return (
		<div className="flex flex-col gap-1">
			<h1 className="font-black text-2xl tracking-tight">Olá, {name}!</h1>
			<p className="text-muted-foreground text-sm">
				Continue de onde parou ou comece um quiz novo.
			</p>
		</div>
	);
}
