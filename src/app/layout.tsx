// app/layout.tsx

// ✨ ADDED: Imports for server-side Supabase auth
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

import { ThemeProvider } from "@/components/theme-provider";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// AuthProvider is no longer needed if it was for Auth0
import { TrpcProviders } from "@/components/trpc-provider";
import { Toaster } from "@/components/ui/sonner";
import SupabaseProvider from "@/components/supabaseProvider"; // Corrected path based on your structure

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SarimGPT",
  description: "Your AI-powered Multimodel companion",
};

// ✨ ADDED: Ensures the layout is always dynamically rendered on the server
export const dynamic = 'force-dynamic';

// ✨ MODIFIED: The layout is now an `async` function
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  // ✨ ADDED: Server-side logic to get the session
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TrpcProviders>
          {/* ✨ MODIFIED: Pass the server-side session to the provider */}
          <SupabaseProvider session={session}>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
            </ThemeProvider>
            <Toaster position="top-center" richColors />
          </SupabaseProvider>
        </TrpcProviders>
      </body>
    </html>
  );
}