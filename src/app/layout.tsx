import type { Metadata } from "next";
import "./globals.css";
import { terminus } from "./fonts";

export const metadata: Metadata = {
  title: "Pixel Blur",
  description:
    "Blur or magnify custom regions on any image with a modular Bun + Next.js playground.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${terminus.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
