import Link from "next/link";
import React from "react";

const adminPages = [
  { title: "Users", href: "/admin/users" },
  { title: "Roles", href: "/admin/roles" },
] as const;

type AdminTitle = (typeof adminPages)[number]["title"];

export const AdminRightNav = ({ selectedTab }: { selectedTab: AdminTitle }) => {
  return (
    <div className="hidden h-fit w-80 flex-col gap-1 rounded-2xl border-2 border-gray-200 p-5 lg:flex">
      {adminPages.map(({ title, href }) => {
        return (
          <Link
            key={title}
            href={href}
            className={[
              "rounded-2xl p-4 font-bold hover:bg-gray-300",
              title === selectedTab ? "bg-gray-300" : "",
            ].join(" ")}
          >
            {title}
          </Link>
        );
      })}
    </div>
  );
};
