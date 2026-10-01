import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Universal Data Formatter",
  description: "Format, validate, and convert JSON, CSV, XML, YAML, and text privately in your browser.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
