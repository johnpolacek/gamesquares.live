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
			<head>
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link
					rel="preconnect"
					href="https://fonts.gstatic.com"
					crossOrigin="anonymous"
				/>
				<link
					href="https://fonts.googleapis.com/css2?family=SN+Pro:ital,wght@0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap"
					rel="stylesheet"
				/>
			</head>
			<body className="font-sans antialiased">
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
