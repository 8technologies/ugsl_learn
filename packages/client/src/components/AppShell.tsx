import Link from "next/link";
import { useRouter } from "next/router";
// import type { PropsWithChildren } from "react";
import {
  BarChart3,
  Bell,
  BookOpen,
  FileText,
  Flame,
  Heart,
  Home as HomeIcon,
  LetterText,
  LogOut,
  PersonStanding,
  School,
  School2,
  Search,
  User,
  Zap,
} from "lucide-react";
import { useBoundStore } from "~/hooks/useBoundStore";
import { useLogout } from "~/hooks/useLogout";
import { sum } from "~/utils/array-utils";

// const NAV_ITEMS = [
//   { name: "Home", href: "/home", icon: HomeIcon },
//   { name: "Learn", href: "/learn", icon: FileText },
//   { name: "Alphabet", href: "/signs", icon: LetterText },
//   { name: "Progress", href: "/progress", icon: BarChart3 },
//   { name: "Dictionary", href: "/favourites", icon: BookOpen },
//   { name: "Content Management", href: "/content-management", icon: School2 },
//   { name: "Admin", 
//     // href: "/admin", 
//     icon: User,
//     children: [
//       { name: "Overview", href: "/admin" },
//       { name: "Users", href: "/admin/users" },     // replace with your real routes
//       { name: "Settings", href: "/admin/settings" },
//     ], },
// ] as const;

// export const AppShell = ({ children }: PropsWithChildren) => {
//   const router = useRouter();
//   const name = useBoundStore((x) => x.name);
//   const streak = useBoundStore((x) => x.streak);
//   const xpByDate = useBoundStore((x) => x.xpByDate);
//   const totalXp = sum(Object.values(xpByDate));
//   const initial = name ? name.charAt(0).toUpperCase() : "A";
//   const logout = useLogout();

//   return (
//     <div className="min-h-screen bg-[#f4f1ec]">
//       <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col justify-between bg-[#1c1f3b] px-4 py-6 text-white">
//         <div> 
//           <div className="mb-8 flex items-center gap-2 px-2">
//             <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 font-bold">
//               4
//             </div>
//             <span className="text-lg font-bold">
//               UGSL <span className="text-orange-400">Learn</span>
//             </span>
//           </div>
//           <nav className="flex flex-col gap-1">
//             {NAV_ITEMS.map(({ name: itemName, href, icon: Icon }) => {
//               const active = router.pathname === href;
//               return (
//                 <Link
//                   key={href}
//                   href={href}
//                   className={[
//                     "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
//                     active
//                       ? "bg-indigo-600 text-white"
//                       : "text-gray-300 hover:bg-white/10",
//                   ].join(" ")}
//                 >
//                   <Icon className="h-5 w-5" />
//                   {itemName}
//                 </Link>
//               );
//             })}
//           </nav>
//         </div>
//         <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
//           <Link
//             href="/profile"
//             className="flex min-w-0 flex-1 items-center gap-3 rounded-lg transition hover:opacity-80"
//           >
//             <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500 font-bold">
//               {initial}
//             </div>
//             <div className="min-w-0">
//               <div className="truncate text-sm font-semibold">
//                 {name || "Guest"}
//               </div>
//               <div className="text-xs text-gray-400">View profile</div>
//             </div>
//           </Link>
//           <button
//             type="button"
//             onClick={() => void logout()}
//             className="shrink-0 rounded-lg p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
//             aria-label="Log out"
//             title="Log out"
//           >
//             <LogOut className="h-4 w-4" />
//           </button>
//         </div>
//       </aside>

//       <div className="flex min-h-screen flex-col pl-64">
//         <header className="flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-8 py-4">
//           <div className="relative w-full max-w-md">
//             <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
//             <input
//               className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm placeholder:text-gray-400"
//               placeholder="Search signs, lessons…"
//             />
//           </div>
//           <div className="flex items-center gap-3">
//             <div className="flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700">
//               <Zap className="h-4 w-4 text-orange-500" />
//               {totalXp}
//             </div>
//             <div className="flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700">
//               <Flame className="h-4 w-4 text-orange-500" />
//               {streak}
//             </div>
//             <button
//               type="button"
//               className="relative rounded-xl border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
//             >
//               <Bell className="h-4 w-4" />
//               <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500" />
//             </button>
//             <Link
//               href="/profile"
//               aria-label="Profile"
//               className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-900 font-bold text-white transition hover:opacity-80"
//             >
//               {initial}
//             </Link>
//           </div>
//         </header>
//         <main className="flex-1 px-8 py-8">{children}</main>
//       </div>
//     </div>
//   );
// };


import { useEffect, useState, type PropsWithChildren } from "react";
import {
  // BarChart3,
  // Bell,
  // BookOpen,
  ChevronDown,
  // FileText,
  // Flame,
  Home,
  // LetterText,
  // Link,
  // LogOut,
  // School2,
  // Search,
  // User,
  // Zap,
} from "lucide-react";
// Keep your existing imports for these (adjust paths to match your project):
// import Link from "next/link";
// import { useRouter } from "next/router";
// import { sum } from "lodash"; (or wherever `sum` comes from)
// import { useBoundStore } from "...";
// import { useLogout } from "...";
// import { HomeIcon, School2 } from "...";

type NavChild = { name: string; href: string };

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavChild[];
};

const NAV_ITEMS: NavItem[] = [
  { name: "Home", href: "/home", icon: Home },
  { name: "Learn", href: "/learn", icon: FileText },
  { name: "Alphabet", href: "/signs", icon: LetterText },
  { name: "Progress", href: "/progress", icon: BarChart3 },
  { name: "Dictionary", href: "/favourites", icon: BookOpen },
  { name: "Content Management", href: "/content-management", icon: School2,
    children: [
      {name: "Levels", href: "/content/levels"},
      {name: "Modules and lessons", href: "/content/modules-lessons"}
    ],
   },
  {
    name: "Admin",
    href: "/admin",
    icon: User,
    children: [
      // { name: "Overview", href: "/admin" },
      { name: "Users", href: "/admin/users" },
      { name: "Roles", href: "/admin/roles" }, // replace with your real routes
    ],
  },
];

const NavDropdown = ({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string;
}) => {
  const { name, href, icon: Icon, children = [] } = item;
  const sectionActive = pathname === href || pathname.startsWith(`${href}/`);
  const [open, setOpen] = useState(sectionActive);

  // Auto-open when navigating into this section from elsewhere
  useEffect(() => {
    if (sectionActive) setOpen(true);
  }, [sectionActive]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={[
          "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
          sectionActive
            ? "bg-indigo-600 text-white"
            : "text-gray-300 hover:bg-white/10",
        ].join(" ")}
      >
        <Icon className="h-5 w-5" />
        <span className="flex-1 text-left">{name}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="ml-5 mt-1 flex flex-col gap-1 border-l border-white/10 pl-3">
          {children.map((child) => {
            const childActive = pathname === child.href;
            return (
              <Link
                key={child.href}
                href={child.href}
                className={[
                  "rounded-lg px-3 py-1.5 text-sm transition",
                  childActive
                    ? "bg-white/10 font-semibold text-white"
                    : "text-gray-400 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                {child.name}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const AppShell = ({ children }: PropsWithChildren) => {
  const router = useRouter();
  const name = useBoundStore((x) => x.name);
  const streak = useBoundStore((x) => x.streak);
  const xpByDate = useBoundStore((x) => x.xpByDate);
  const totalXp = sum(Object.values(xpByDate));
  const initial = name ? name.charAt(0).toUpperCase() : "A";
  const logout = useLogout();

  return (
    <div className="min-h-screen bg-[#f4f1ec]">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col justify-between bg-[#1c1f3b] px-4 py-6 text-white">
        <div>
          <div className="mb-8 flex items-center gap-2 px-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 font-bold">
              4
            </div>
            <span className="text-lg font-bold">
              UGSL <span className="text-orange-400">Learn</span>
            </span>
          </div>
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              if (item.children?.length) {
                return (
                  <NavDropdown
                    key={item.href}
                    item={item}
                    pathname={router.pathname}
                  />
                );
              }

              const { name: itemName, href, icon: Icon } = item;
              const active = router.pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={[
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-indigo-600 text-white"
                      : "text-gray-300 hover:bg-white/10",
                  ].join(" ")}
                >
                  <Icon className="h-5 w-5" />
                  {itemName}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
          <Link
            href="/profile"
            className="flex min-w-0 flex-1 items-center gap-3 rounded-lg transition hover:opacity-80"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500 font-bold">
              {initial}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">
                {name || "Guest"}
              </div>
              <div className="text-xs text-gray-400">View profile</div>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => void logout()}
            className="shrink-0 rounded-lg p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col pl-64">
        <header className="flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-8 py-4">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm placeholder:text-gray-400"
              placeholder="Search signs, lessons…"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700">
              <Zap className="h-4 w-4 text-orange-500" />
              {totalXp}
            </div>
            <div className="flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700">
              <Flame className="h-4 w-4 text-orange-500" />
              {streak}
            </div>
            <button
              type="button"
              className="relative rounded-xl border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500" />
            </button>
            <Link
              href="/profile"
              aria-label="Profile"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-900 font-bold text-white transition hover:opacity-80"
            >
              {initial}
            </Link>
          </div>
        </header>
        <main className="flex-1 px-8 py-8">{children}</main>
      </div>
    </div>
  );
};