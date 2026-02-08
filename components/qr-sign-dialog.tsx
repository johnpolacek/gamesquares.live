"use client";

import { useCallback, useRef, useState } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";

type QrSignDialogProps = {
	open: boolean;
	onClose: () => void;
	poolTitle: string;
	shareUrl: string;
};

export function QrSignDialog({
	open,
	onClose,
	poolTitle,
	shareUrl,
}: QrSignDialogProps) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [downloading, setDownloading] = useState(false);

	const handleDownload = useCallback(() => {
		// Find the canvas rendered by QRCodeCanvas (hidden, used for download)
		const canvas = canvasRef.current;
		if (!canvas) return;
		setDownloading(true);
		try {
			const dataUrl = canvas.toDataURL("image/png");
			const link = document.createElement("a");
			link.download = `${poolTitle.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}-qr-code.png`;
			link.href = dataUrl;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		} finally {
			setDownloading(false);
		}
	}, [poolTitle]);

	const handlePrint = useCallback(() => {
		const canvas = canvasRef.current;
		const qrDataUrl = canvas ? canvas.toDataURL("image/png") : "";

		const printWindow = window.open("", "_blank");
		if (!printWindow) return;

		const displayUrl = shareUrl.replace(/^https?:\/\/(www\.)?/, "");

		printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>QR Code - ${escapeHtml(poolTitle)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: auto; margin: 0.5in; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: white;
    color: black;
  }
  .sign {
    text-align: center;
    padding: 2rem;
    max-width: 500px;
  }
  .sign h1 {
    font-size: 2rem;
    font-weight: 800;
    margin-bottom: 0.25rem;
    line-height: 1.2;
  }
  .sign .subtitle {
    font-size: 1rem;
    color: #666;
    margin-bottom: 1.5rem;
  }
  .sign .qr-wrap {
    display: inline-block;
    padding: 1rem;
    border: 3px solid black;
    border-radius: 12px;
    margin-bottom: 1.25rem;
  }
  .sign .qr-wrap img { display: block; }
  .sign .cta {
    font-size: 1.75rem;
    font-weight: 800;
    margin-bottom: 0.75rem;
    letter-spacing: -0.02em;
  }
  .sign .url {
    font-size: 0.875rem;
    color: #666;
    word-break: break-all;
  }
  .sign .brand {
    margin-top: 1.5rem;
    font-size: 0.75rem;
    color: #999;
  }
</style>
</head>
<body>
<div class="sign">
  <h1>${escapeHtml(poolTitle)}</h1>
  <p class="subtitle">Football Squares</p>
  <div class="qr-wrap">
    <img src="${qrDataUrl}" width="220" height="220" alt="QR Code" />
  </div>
  <p class="cta">Scan to Join!</p>
  <p class="url">${escapeHtml(displayUrl)}</p>
  <p class="brand">Powered by GameSquares.live</p>
</div>
</body>
</html>`);
		printWindow.document.close();
		// Wait for image to load then print
		const img = printWindow.document.querySelector("img");
		if (img?.complete) {
			printWindow.print();
		} else if (img) {
			img.onload = () => printWindow.print();
		} else {
			setTimeout(() => {
				try {
					printWindow.print();
				} catch {
					// Window may already be closed
				}
			}, 300);
		}
	}, [poolTitle, shareUrl]);

	if (!open) return null;

	const displayUrl = shareUrl.replace(/^https?:\/\/(www\.)?/, "");

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: backdrop dismiss is supplementary to the close button
		<div
			role="dialog"
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 animate-fade-in"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-lg ring-1 ring-border animate-fade-in-up">
				{/* Close button */}
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-base font-bold text-foreground">
						QR Code Sign
					</h3>
					<button
						onClick={onClose}
						className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
						type="button"
						aria-label="Close"
					>
						<svg
							width="16"
							height="16"
							viewBox="0 0 16 16"
							fill="none"
							aria-hidden="true"
						>
							<path
								d="M4 4L12 12M12 4L4 12"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
							/>
						</svg>
					</button>
				</div>

				{/* Sign preview */}
				<div className="rounded-lg border-2 border-border bg-white p-5 text-center space-y-3 mb-5">
					<div>
						<h4 className="text-lg font-extrabold text-black leading-tight">
							{poolTitle}
						</h4>
						<p className="text-xs text-gray-500">Football Squares</p>
					</div>

					<div className="inline-block rounded-lg border-2 border-black p-2.5">
						<QRCodeSVG
							value={shareUrl}
							size={160}
							level="M"
							marginSize={0}
						/>
					</div>

					<p className="text-xl font-extrabold text-black tracking-tight">
						Scan to Join!
					</p>

					<p className="text-[11px] text-gray-500 break-all">
						{displayUrl}
					</p>

					<p className="text-[9px] text-gray-400 pt-1">
						Powered by GameSquares.live
					</p>
				</div>

				{/* Hidden canvas for PNG download */}
				<div className="hidden">
					<QRCodeCanvas
						value={shareUrl}
						size={512}
						level="M"
						marginSize={2}
						ref={(node: HTMLCanvasElement | null) => {
							canvasRef.current = node;
						}}
					/>
				</div>

				{/* Actions */}
				<div className="flex gap-2">
					<button
						onClick={handleDownload}
						disabled={downloading}
						className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2.5 text-xs font-semibold text-foreground transition-all active:scale-[0.97] cursor-pointer hover:bg-muted disabled:opacity-50"
						type="button"
					>
						<svg
							width="14"
							height="14"
							viewBox="0 0 16 16"
							fill="none"
							aria-hidden="true"
						>
							<path
								d="M8 2v8m0 0L5 7m3 3l3-3M3 12h10"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
						Download QR
					</button>
					<button
						onClick={handlePrint}
						className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition-all active:scale-[0.97] cursor-pointer"
						type="button"
					>
						<svg
							width="14"
							height="14"
							viewBox="0 0 16 16"
							fill="none"
							aria-hidden="true"
						>
							<rect
								x="3"
								y="6"
								width="10"
								height="6"
								rx="1"
								stroke="currentColor"
								strokeWidth="1.5"
							/>
							<path
								d="M5 6V3h6v3"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
							/>
							<path
								d="M5 10h6"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
							/>
						</svg>
						Print Sign
					</button>
				</div>
			</div>
		</div>
	);
}

/** Escape HTML entities for safe insertion into the print window. */
function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

