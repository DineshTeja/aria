import type { Metadata } from "next";
import { Lora } from 'next/font/google';
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AnamContextProvider } from "./contexts/AnamContext";
import { getSessionToken } from "@/lib/server-lib";

const lora = Lora({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-lora',
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
  const sessionToken = await getSessionToken(process.env.ANAM_API_KEY || '');
  return (
    <html lang="en" className={`${lora.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=0.8"/>
      </head>
      <body className={lora.className}>
        <AnamContextProvider sessionToken={sessionToken}>
          {children}
        </AnamContextProvider>
        <Toaster />
      </body>
    </html>
  );
}
