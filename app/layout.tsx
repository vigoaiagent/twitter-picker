import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Twitter Giveaway Picker",
  description: "Pick random winners from tweet interactions - replies, retweets, likes, and quotes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
