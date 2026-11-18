import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../lib/auth";
import { Nav } from "./Nav";

// The app renders all data client-side against the backend API.
// Disable static-shell validation for the whole app.
export const instant = false;

export const metadata: Metadata = {
  title: "Workshop Registration",
  description: "Search for and register for workshops",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Nav />
          <main className="container">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}