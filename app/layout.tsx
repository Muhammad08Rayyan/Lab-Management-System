import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Lora, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const plusJakartaSans = Plus_Jakarta_Sans({ 
  subsets: ["latin"],
  variable: "--font-sans",
});

const lora = Lora({ 
  subsets: ["latin"],
  variable: "--font-serif",
});

const robotoMono = Roboto_Mono({ 
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Health Inn Services Laboratory",
  description: "Professional diagnostic laboratory services with comprehensive testing solutions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${plusJakartaSans.variable} ${lora.variable} ${robotoMono.variable}`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
