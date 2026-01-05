import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dreddi knows",
  description: "Promises tracked. Reputation earned.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
