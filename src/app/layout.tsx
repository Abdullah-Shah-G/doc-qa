import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DocAssistant - Document Q&A",
  description: "Upload documents and ask questions with AI-powered retrieval",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
