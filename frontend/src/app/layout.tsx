import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import NextTopLoader from "nextjs-toploader";
import QueryProvider from "@/providers/QueryProvider";
import { AuthBootstrap } from "@/components/AuthBootstrap";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "BacancyTeleCare - Your Health, Our Priority",
  description: "Modern telemedicine platform for remote consultations",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body>
        <NextTopLoader color="#0ea5e9" height={3} showSpinner={false} shadow="0 0 10px #0ea5e9,0 0 5px #0ea5e9" />
        <AuthBootstrap />
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
