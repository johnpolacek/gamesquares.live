import type { Metadata, Viewport } from "next";
import type React from "react";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
	title: "GameSquares.live - Football Squares",
	description:
		"Create and share Football square pools with friends. Pick your squares, track the game, win big.",
};

export const viewport: Viewport = {
	themeColor: "#1a6b3c",
	width: "device-width",
	initialScale: 1,
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className="font-sans antialiased">
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
