import type { NextPage } from "next";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Pencil, Search, Trash2, UserPlus } from "lucide-react";
import { AppShell } from "~/components/AppShell";
import { PasswordInput } from "~/components/auth/PasswordInput";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { useBoundStore } from "~/hooks/useBoundStore";
import { LOAD_USERS, ROLES } from "~/gql/queries";
import { CREATE_USER, DELETE_USER, UPDATE_USER } from "~/gql/mutations";

const PAGE_SIZE = 10;

type Role = {
  id: string;
  name: string;
};

type User = {
  id: string;
  username: string;
  name: string;
  email: string;
  roleId: string | null;
  role: Role | null;
  createdAt: string;
};

type UsersQueryResult = { users: User[] };
type RolesQueryResult = { roles: Role[] };
type CreateUserResult = { createUser: User };
type UpdateUserResult = { updateUser: User };
type DeleteUserResult = { deleteUser: { success: boolean; message: string } };

type UserFormState = {
  id: string | null;
  username: string;
  name: string;
  email: string;
  password: string;
  roleId: string;
};

const emptyForm: UserFormState = {
  id: null,
  username: "",
  name: "",
  email: "",
  password: "",
  roleId: "",
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const FormField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
    {children}
  </div>
);

const AdminUsersPage: NextPage = () => {
  const router = useRouter();
  const loggedIn = useBoundStore((x) => x.loggedIn);
  const hasHydrated = useBoundStore((x) => x.hasHydrated);

  useEffect(() => {
    if (hasHydrated && !loggedIn) void router.replace("/login");
  }, [hasHydrated, loggedIn, router]);

  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: rolesData } = useQuery<RolesQueryResult>(ROLES);
  const roles = rolesData?.roles ?? [];

  const {
    data: usersData,
    loading: usersLoading,
    error: usersError,
    refetch,
  } = useQuery<UsersQueryResult>(LOAD_USERS, {
    variables: {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      search: search.trim() || undefined,
      roleId: roleFilter || undefined,
    },
    fetchPolicy: "network-only",
  });
  const users = usersData?.users ?? [];
  const hasNextPage = users.length === PAGE_SIZE;

  const [createUser, { loading: creating }] =
    useMutation<CreateUserResult>(CREATE_USER);
  const [updateUser, { loading: updating }] =
    useMutation<UpdateUserResult>(UPDATE_USER);
  const [deleteUser] = useMutation<DeleteUserResult>(DELETE_USER);

  const isEditing = form.id !== null;
  const saving = creating || updating;

  const openCreateForm = () => {
    setForm(emptyForm);
    setErrorMessage(null);
    setIsFormOpen(true);
  };

  const openEditForm = (user: User) => {
    setForm({
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      password: "",
      roleId: user.roleId ?? "",
    });
    setErrorMessage(null);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      if (isEditing && form.id) {
        await updateUser({
          variables: {
            id: form.id,
            input: {
              username: form.username,
              name: form.name,
              email: form.email,
              roleId: form.roleId || undefined,
              ...(form.password ? { password: form.password } : {}),
            },
          },
        });
      } else {
        await createUser({
          variables: {
            input: {
              username: form.username,
              name: form.name,
              email: form.email,
              password: form.password,
              roleId: form.roleId,
            },
          },
        });
      }

      setIsFormOpen(false);
      toast.success(isEditing ? "User updated" : "User created");
      void refetch();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Could not save this user."));
    }
  };

  const handleDelete = async (user: User) => {
    if (!window.confirm(`Delete user "${user.username}"?`)) return;
    setDeletingId(user.id);
    try {
      await deleteUser({ variables: { id: user.id } });
      toast.success(`Deleted ${user.username}`);
      void refetch();
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not delete this user."));
    } finally {
      setDeletingId(null);
    }
  };

  if (!hasHydrated || !loggedIn) return null;

  return (
    <AppShell>
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Users</h1>
            <p className="mt-1 text-gray-500">Manage users and their roles</p>
          </div>
          <button
            type="button"
            onClick={openCreateForm}
            className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600"
          >
            <UserPlus className="h-4 w-4" />
            New user
          </button>
        </div>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 p-4">
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400"
                placeholder="Search by name, username or email"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
              />
            </div>
            <select
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(0);
              }}
            >
              <option value="">All roles</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          {usersError && (
            <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {getErrorMessage(usersError, "Failed to load users.")}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  <tr>
                    <td className="py-10 text-center text-gray-400" colSpan={4}>
                      Loading users…
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td className="py-10 text-center text-gray-400" colSpan={4}>
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-gray-100 transition last:border-0 hover:bg-gray-50"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
                            {(user.name || user.username).charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-gray-900">{user.name}</div>
                            <div className="truncate text-xs text-gray-500">@{user.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-700">{user.email}</td>
                      <td className="px-5 py-3">
                        {user.role ? (
                          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                            {user.role.name}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">No role</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditForm(user)}
                            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                            aria-label={`Edit ${user.username}`}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(user)}
                            disabled={deletingId === user.id}
                            className="rounded-lg p-2 text-gray-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            aria-label={`Delete ${user.username}`}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-gray-200 px-5 py-3 text-sm text-gray-500">
            <span>Page {page + 1}</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-1.5 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasNextPage}
                className="flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-1.5 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit user" : "Create user"}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Full name">
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Jane Doe"
                    required
                  />
                </FormField>
                <FormField label="Username">
                  <Input
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="janedoe"
                    required
                  />
                </FormField>
              </div>
              <FormField label="Email">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  required
                />
              </FormField>
              <FormField label={isEditing ? "New password (optional)" : "Password"}>
                <PasswordInput
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  required={!isEditing}
                />
              </FormField>
              <FormField label="Role">
                <select
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
                  value={form.roleId}
                  onChange={(e) => setForm({ ...form, roleId: e.target.value })}
                  required={!isEditing}
                >
                  <option value="">Select role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </FormField>

              {errorMessage && <p className="text-sm font-semibold text-red-500">{errorMessage}</p>}

              <DialogFooter className="mt-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-50"
                >
                  {saving ? "Saving…" : isEditing ? "Save changes" : "Create user"}
                </button>
              </DialogFooter>
            </form>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default AdminUsersPage;
