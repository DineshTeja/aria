import type { Metadata } from "next";
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AnamContextProvider } from "./contexts/AnamContext";
import { getSessionToken } from "@/lib/server-lib";

export const metadata: Metadata = {
  title: "Aria",
  description: "AI Doctor",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sessionToken = await getSessionToken(process.env.ANAM_API_KEY || '');
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=0.8"/>
      </head>
      <body className={GeistSans.className}>
        <AnamContextProvider sessionToken={sessionToken}>
          {children}
        </AnamContextProvider>
        <Toaster />
      </body>
    </html>
  );
}