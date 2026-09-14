export interface PresignedUploadTarget {
	uploadUrl: string;
	method: "PUT";
	headers: Record<string, string>;
}

/**
 * Uploads straight to object storage with a presigned URL. Uses
 * XMLHttpRequest because fetch cannot report upload progress.
 */
export function uploadFile({
	file,
	upload,
	onProgress,
	createRequest = () => new XMLHttpRequest(),
}: {
	file: Blob;
	upload: PresignedUploadTarget;
	/** Fraction from 0 to 1. */
	onProgress?: (fraction: number) => void;
	createRequest?: () => XMLHttpRequest;
}): Promise<void> {
	return new Promise((resolve, reject) => {
		const request = createRequest();
		request.open(upload.method, upload.uploadUrl);
		for (const [name, value] of Object.entries(upload.headers)) {
			request.setRequestHeader(name, value);
		}
		request.upload.onprogress = (event) => {
			if (event.lengthComputable) {
				onProgress?.(event.loaded / event.total);
			}
		};
		request.onload = () => {
			if (request.status >= 200 && request.status < 300) {
				onProgress?.(1);
				resolve();
			} else {
				reject(new Error(`Upload failed with status ${request.status}`));
			}
		};
		request.onerror = () => {
			reject(new Error("Upload failed because of a network error"));
		};
		request.send(file);
	});
}
