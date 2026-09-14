import { expect, test } from "@playwright/test";

test("design system page renders the four answer alternatives in Kahoot order", async ({
	page,
}) => {
	await page.goto("/design-system");

	await expect(
		page.getByRole("heading", { name: "Design system", level: 1 }),
	).toBeVisible();

	const shapes = page
		.locator("[data-slot=answer-option]")
		.evaluateAll((options) =>
			options.slice(0, 4).map((option) => option.getAttribute("data-shape")),
		);
	expect(await shapes).toEqual(["triangle", "diamond", "circle", "square"]);
});
