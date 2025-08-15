// components/supabaseProvider.tsx
"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import type { Session } from "@supabase/supabase-js";

// ✨ MODIFIED: The component now accepts the session prop
export default function SupabaseProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  // This client is created once and doesn't depend on the session
  const [supabaseClient] = useState(() => createClientComponentClient());

  return (
    <SessionContextProvider
      supabaseClient={supabaseClient}
      // ✨ MODIFIED: The initial session is now passed from the server
      initialSession={session}
    >
      {children}
    </SessionContextProvider>
  );
}