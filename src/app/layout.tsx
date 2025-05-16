import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QuickNavigation } from "@/components/features/Navigation";
import { AuthProvider } from "@/lib/auth/auth-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Pizza Mia - Restaurant Management System",
  description: "Modern restaurant management for Pizza Mia New Lenox",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <QuickNavigation />
        </AuthProvider>
      </body>
    </html>
  );
}
