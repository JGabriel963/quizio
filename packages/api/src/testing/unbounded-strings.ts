interface SchemaDef {
	type?: string;
	shape?: Record<string, unknown>;
	element?: unknown;
	innerType?: unknown;
	options?: unknown[];
	in?: unknown;
	out?: unknown;
	left?: unknown;
	right?: unknown;
	keyType?: unknown;
	valueType?: unknown;
	items?: unknown[];
	getter?: () => unknown;
}

function defOf(schema: unknown): SchemaDef | null {
	const zod = (schema as { _zod?: { def?: SchemaDef } } | null)?._zod;
	return zod?.def ?? null;
}

/**
 * The paths of the string inputs with no maximum in a zod schema (audit L6):
 * every text that reaches the edge has a cap, whatever the core checks later.
 */
export function unboundedStrings(
	schema: unknown,
	path = "input",
	seen = new Set<unknown>(),
): string[] {
	const def = defOf(schema);
	if (!def || seen.has(schema)) {
		return [];
	}
	seen.add(schema);
	switch (def.type) {
		case "string":
			return (schema as { maxLength: number | null }).maxLength === null
				? [path]
				: [];
		case "object":
			return Object.entries(def.shape ?? {}).flatMap(([key, value]) =>
				unboundedStrings(value, `${path}.${key}`, seen),
			);
		case "array":
			return unboundedStrings(def.element, `${path}[]`, seen);
		case "union":
			return (def.options ?? []).flatMap((option) =>
				unboundedStrings(option, path, seen),
			);
		case "pipe":
			return unboundedStrings(def.in, path, seen);
		case "intersection":
			return [
				...unboundedStrings(def.left, path, seen),
				...unboundedStrings(def.right, path, seen),
			];
		case "record":
			return [
				...unboundedStrings(def.keyType, `${path}{key}`, seen),
				...unboundedStrings(def.valueType, `${path}{}`, seen),
			];
		case "tuple":
			return (def.items ?? []).flatMap((item, index) =>
				unboundedStrings(item, `${path}[${index}]`, seen),
			);
		case "lazy":
			return unboundedStrings(def.getter?.(), path, seen);
		default:
			return def.innerType === undefined
				? []
				: unboundedStrings(def.innerType, path, seen);
	}
}
