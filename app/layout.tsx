import { AnamContextProvider } from "./contexts/AnamContext";
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { getSessionToken } from "@/lib/server-lib";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Aria",
  description: "AI Doctor",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sessionToken = await getSessionToken(process.env.ANAM_API_KEY!);
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AnamContextProvider sessionToken={sessionToken}>
          {children}
        </AnamContextProvider>
      </body>
    </html>
  );
}
