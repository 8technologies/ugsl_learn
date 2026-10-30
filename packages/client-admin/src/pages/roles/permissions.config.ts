import { BookOpen, GraduationCap, HelpCircle, ShieldCheck } from "lucide-react";

export type PermissionItem = {
  id: string;
  label: string;
};

export type ModuleConfig = {
  id: string;
  name: string;
  icon: any;
  permissions: PermissionItem[];
};

// Mirrors the server's actual schema modules (packages/server/schema/*):
// user, role, learner, quiz. "System Administration" keys are the ones
// currently enforced by requireAnyPermission() in schema/role/resolvers.js;
// the learner/quiz keys are forward-looking for when those modules grow
// real queries and mutations (their typeDefs only declare bare types today).
export const MODULES_CONFIG: ModuleConfig[] = [
  {
    id: "learners",
    name: "Learners",
    icon: GraduationCap,
    permissions: [
      { id: "can_view_learners", label: "Can View Learners" },
      { id: "can_manage_learners", label: "Can Manage Learners" },
      { id: "can_view_learner_progress", label: "Can View Learner Progress" },
      { id: "can_edit_learner_progress", label: "Can Edit Learner Progress" },
    ],
  },
  {
    id: "content",
    name: "Learning Content",
    icon: BookOpen,
    permissions: [
      { id: "can_view_content", label: "Can View Lessons & Levels" },
      { id: "can_create_content", label: "Can Create Lessons & Levels" },
      { id: "can_edit_content", label: "Can Edit Lessons & Levels" },
      { id: "can_delete_content", label: "Can Delete Lessons & Levels" },
      { id: "can_review_content", label: "Can Review & Approve Content" },
    ],
  },
  {
    id: "quizzes",
    name: "Quizzes",
    icon: HelpCircle,
    permissions: [
      { id: "can_view_quizzes", label: "Can View Quizzes" },
      { id: "can_create_quizzes", label: "Can Create Quizzes" },
      { id: "can_edit_quizzes", label: "Can Edit Quizzes" },
      { id: "can_delete_quizzes", label: "Can Delete Quizzes" },
    ],
  },
  {
    id: "system_configuration",
    name: "System Administration",
    icon: ShieldCheck,
    permissions: [
      { id: "can_create_users", label: "Can Create Users" },
      { id: "can_manage_users", label: "Can Manage Users" },
      { id: "can_manage_roles", label: "Can Manage Roles" },
      { id: "can_view_roles", label: "Can View Roles" },
      { id: "can_create_roles", label: "Can Create or Edit Roles" },
      { id: "can_delete_roles", label: "Can Delete Roles" },
      {
        id: "can_update_role_permissions",
        label: "Can Update Role Permissions",
      },
    ],
  },
];