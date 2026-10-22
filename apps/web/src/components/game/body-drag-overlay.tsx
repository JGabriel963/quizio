import { DragOverlay } from "@dnd-kit/core";
import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * dnd-kit's overlay, drawn in `<body>`. It is `position: fixed`, and an
 * ancestor with a transform (a screen's entrance animation keeps one) would
 * become its frame, throwing the dragged block away from the pointer.
 * No drop animation: the place it would fly back to may be gone after the move.
 */
export function BodyDragOverlay({ children }: { children: ReactNode }) {
	const [body, setBody] = useState<HTMLElement | null>(null);
	useEffect(() => setBody(document.body), []);
	const overlay = <DragOverlay dropAnimation={null}>{children}</DragOverlay>;
	return body ? createPortal(overlay, body) : overlay;
}
