import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import { FeedProvider } from "@/components/feed/FeedProvider";
import { posts } from "@/lib/data";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${fredoka.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cream text-ink">
        <FeedProvider initialPosts={posts}>{children}</FeedProvider>
      </body>
    </html>
  );
}
