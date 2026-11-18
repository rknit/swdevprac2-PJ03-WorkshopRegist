import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../lib/auth";
import { Nav } from "./Nav";

// The app renders all data client-side against the backend API.
// Disable static-shell validation for the whole app.
export const instant = false;

// Figma text styles use Bricolage Grotesque (display, headings) and DM Sans
// (body, labels), both with the optical-size axis set to 14.
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], axes: ["opsz", "wdth"], variable: "--font-bricolage", display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], axes: ["opsz"], variable: "--font-dm-sans", display: "swap" });

export const metadata: Metadata = {
  title: "WorkJam — Workshop Registration",
  description: "Search for and register for workshops",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bricolage.variable} ${dmSans.variable}`}>
      <body>
        <AuthProvider>
          <Nav />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
