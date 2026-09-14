import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
	CoverImageField,
	type CoverImageFieldProps,
} from "./cover-image-field";

const png = () => new File(["png-bytes"], "capa.png", { type: "image/png" });

function renderField(overrides: Partial<CoverImageFieldProps> = {}) {
	const props: CoverImageFieldProps = {
		imageUrl: null,
		onChange: vi.fn(),
		upload: vi.fn(async () => ({
			key: "media/user-1/id-1.png",
			url: "https://media.test/media/user-1/id-1.png",
		})),
		...overrides,
	};
	const view = render(<CoverImageField {...props} />);
	return { props, ...view };
}

describe("CoverImageField", () => {
	it("uploads a cover and reports the new key", async () => {
		const { props } = renderField();

		await userEvent.setup().upload(screen.getByLabelText("Enviar capa"), png());

		expect(props.upload).toHaveBeenCalledWith(
			expect.objectContaining({ name: "capa.png" }),
			expect.any(Function),
		);
		expect(props.onChange).toHaveBeenCalledWith({
			type: "set",
			key: "media/user-1/id-1.png",
			url: "https://media.test/media/user-1/id-1.png",
		});
	});

	it("previews the current cover and removes it", async () => {
		const { props } = renderField({ imageUrl: "https://media.test/old.png" });

		expect(screen.getByRole("img", { name: "Capa do quiz" })).toHaveAttribute(
			"src",
			"https://media.test/old.png",
		);
		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: "Remover capa" }));

		expect(props.onChange).toHaveBeenCalledWith({ type: "remove" });
	});

	it("keeps the previous cover when the upload fails", async () => {
		const { props } = renderField({
			imageUrl: "https://media.test/old.png",
			upload: vi.fn(async () => {
				throw new Error("network");
			}),
		});

		await userEvent.setup().upload(screen.getByLabelText("Enviar capa"), png());

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Não foi possível enviar a imagem. A capa anterior foi mantida.",
		);
		expect(props.onChange).not.toHaveBeenCalled();
		expect(screen.getByRole("img", { name: "Capa do quiz" })).toHaveAttribute(
			"src",
			"https://media.test/old.png",
		);
	});

	it.each([
		["an SVG", new File(["<svg/>"], "capa.svg", { type: "image/svg+xml" })],
		["a PDF", new File(["%PDF"], "capa.pdf", { type: "application/pdf" })],
		[
			"an image above 10 MB",
			new File([new Uint8Array(10 * 1024 * 1024 + 1)], "grande.png", {
				type: "image/png",
			}),
		],
	])("rejects %s before uploading", async (_, file) => {
		const { props } = renderField();

		await userEvent
			.setup({ applyAccept: false })
			.upload(screen.getByLabelText("Enviar capa"), file);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Use uma imagem JPEG, PNG, GIF ou WebP de até 10 MB.",
		);
		expect(props.upload).not.toHaveBeenCalled();
		expect(props.onChange).not.toHaveBeenCalled();
	});
});
