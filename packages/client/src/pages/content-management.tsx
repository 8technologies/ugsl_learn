import type { NextPage } from "next";
import { useRouter } from "next/router";
import React, { useEffect } from "react";
import { AppShell } from "~/components/AppShell";
import { useBoundStore } from "~/hooks/useBoundStore";

const ProgressPage: NextPage = () => {
  const router = useRouter();
  const loggedIn = useBoundStore((x) => x.loggedIn);
  const hasHydrated = useBoundStore((x) => x.hasHydrated);

  useEffect(() => {
    if (hasHydrated && !loggedIn) void router.replace("/login");
  }, [hasHydrated, loggedIn, router]);

  if (!hasHydrated || !loggedIn) return null;

  return (
    <AppShell>
      <h1 className="text-3xl font-bold text-gray-900">Lesson Managemnt</h1>
      <p className="mt-1 text-gray-500">
        Your Lesson uploads are coming soon.
      </p>
    </AppShell>
  );
};

export default ProgressPage;
