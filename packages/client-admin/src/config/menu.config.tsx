import { type TMenuConfig } from "@/components/menu";
import { MODULES_CONFIG } from "@/pages/roles/permissions.config";

// Helper: find permission id by module + permission id
const byModuleId = Object.fromEntries(MODULES_CONFIG.map((m) => [m.id, m]));
const getPerm = (moduleId: string, permissionId: string) => {
  const m = byModuleId[moduleId];
  const p = m?.permissions.find((x) => x.id === permissionId);
  // console.log("perm", permissionId);
  return p?.id ?? permissionId; // fallback to key
};

// Sidebar menu customized for STTS
// You can optionally add `requiredPermissions?: string[]` to control visibility
export const MENU_SIDEBAR: TMenuConfig = [
  {
    title: "Content Management",
    icon: "book-open",
    children: [
      {
        title: "Levels",
        path: "/content/levels",
        requiredPermissions: [getPerm("content", "can_view_content")],
      },
      {
        title: "Modules & Lessons",
        path: "/content/modules",
        requiredPermissions: [getPerm("content", "can_view_content")],
      },
    ],
  },
  {
    title: "System Configuration",
    icon: "setting-2",
    children: [
      {
        title: "Users",
        path: "/admin/users",
        // requiredPermissions: [
        //   getPerm("system_configuration", "can_manage_users"),
        // ],
      },
      {
        title: "Roles",
        path: "/admin/roles",
        // requiredPermissions: [
        //   getPerm("system_configuration", "can_manage_roles"),
        // ],
      },
    ],
  },
  {
    title: "My Profile",
    icon: "profile-circle",
    children: [
      { title: "Overview", path: "/account/home/user-profile" },
      // { title: "Security", path: "/account/security/overview" },
    ],
  },
];

// Minimal root menu for other demo layouts that rely on it
export const MENU_ROOT: TMenuConfig = [
  {
    title: "STTS",
    icon: "element-11",
    rootPath: "/",
    path: "/",
    childrenIndex: 0,
  },
  {
    title: "Account",
    icon: "setting-2",
    rootPath: "/account/",
    path: "/account/home/user-profile",
    childrenIndex: 0,
  },
  {
    title: "Authentication",
    icon: "security-user",
    rootPath: "/auth/",
    path: "/auth/login",
    childrenIndex: 0,
  },
];

// Minimal root menu for other demo layouts that rely on it
export const MENU_MEGA: TMenuConfig = [
  // { title: 'STTS', icon: 'element-11', rootPath: '/', path: '/', childrenIndex: 0 },
  // { title: 'Account', icon: 'setting-2', rootPath: '/account/', path: '/account/home/user-profile', childrenIndex: 0 },
  // { title: 'Authentication', icon: 'security-user', rootPath: '/auth/', path: '/auth/login', childrenIndex: 0 }
];
