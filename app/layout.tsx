import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import { FeedProvider } from "@/components/feed/FeedProvider";
import { getComposerData } from "@/lib/feed/composer";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OpenDayCare",
  description: "Feed diario de la guardería",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const composerData = await getComposerData();

  return (
    <html
      lang="es"
      className={`${fredoka.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cream text-ink">
        <FeedProvider composerData={composerData}>{children}</FeedProvider>
      </body>
    </html>
  );
}
