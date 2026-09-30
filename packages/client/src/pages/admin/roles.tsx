import type { NextPage } from "next";
import { useRouter } from "next/router";
import React, { useEffect } from "react";
import { TopBar } from "~/components/TopBar";
import { LeftBar } from "~/components/LeftBar";
import { BottomBar } from "~/components/BottomBar";
import { AdminRightNav } from "~/components/AdminRightNav";
import { RolesListPage } from "~/components/admin/roles/RolesListPage";
import { useBoundStore } from "~/hooks/useBoundStore";

const AdminRolesPage: NextPage = () => {
  const router = useRouter();
  const loggedIn = useBoundStore((x) => x.loggedIn);
  const hasHydrated = useBoundStore((x) => x.hasHydrated);

  useEffect(() => {
    if (hasHydrated && !loggedIn) void router.replace("/?login");
  }, [hasHydrated, loggedIn, router]);

  if (!hasHydrated || !loggedIn) return null;

  return (
    <div>
      <TopBar />
      <LeftBar selectedTab="Admin" />
      <BottomBar selectedTab="Admin" />
      <div className="mx-auto flex flex-col gap-5 px-4 py-20 sm:py-10 md:pl-28 lg:pl-72">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between lg:max-w-4xl">
          <div>
            <h1 className="text-lg font-bold text-gray-800 sm:text-2xl">Roles</h1>
            <p className="text-sm text-gray-500">Manage roles and their permissions</p>
          </div>
        </div>

        <div className="flex justify-center gap-12">
          <div className="w-full max-w-xl lg:max-w-4xl">
            <RolesListPage />
          </div>
          {/* <AdminRightNav selectedTab="Roles" /> */}
        </div>
      </div>
    </div>
  );
};

export default AdminRolesPage;
