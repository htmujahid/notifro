import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	metadataBase: new URL("https://admin.renderical.com"),
	title: {
		default: "Renderical Admin",
		template: "%s · Renderical Admin",
	},
	description: "Internal operator console for the Renderical notification platform.",
	applicationName: "Renderical Admin",
	icons: {
		icon: "/favicon.svg",
	},
	// Internal tooling — never index.
	robots: {
		index: false,
		follow: false,
		nocache: true,
		googleBot: { index: false, follow: false },
	},
};

export const viewport: Viewport = {
	themeColor: "#FFFFFF",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
		</html>
	);
}
