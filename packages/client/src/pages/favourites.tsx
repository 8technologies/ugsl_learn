import type { NextPage } from "next";
import { useRouter } from "next/router";
import React, { useEffect } from "react";
import { AppShell } from "~/components/AppShell";
import { useBoundStore } from "~/hooks/useBoundStore";

const FavouritesPage: NextPage = () => {
  const router = useRouter();
  const loggedIn = useBoundStore((x) => x.loggedIn);
  const hasHydrated = useBoundStore((x) => x.hasHydrated);

  useEffect(() => {
    if (hasHydrated && !loggedIn) void router.replace("/login");
  }, [hasHydrated, loggedIn, router]);

  if (!hasHydrated || !loggedIn) return null;

  return (
    <AppShell>
      <h1 className="text-3xl font-bold text-gray-900">Favourites</h1>
      <p className="mt-1 text-gray-500">
        Signs you've favourited will show up here soon.
      </p>
    </AppShell>
  );
};

export default FavouritesPage;
