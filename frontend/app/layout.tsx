import { Providers } from './providers';
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Madrasti",
  description: "Madrasti platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
