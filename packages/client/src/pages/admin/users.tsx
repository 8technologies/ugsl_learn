import type { NextPage } from "next";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { TopBar } from "~/components/TopBar";
import { LeftBar } from "~/components/LeftBar";
import { BottomBar } from "~/components/BottomBar";
import { AdminRightNav } from "~/components/AdminRightNav";
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

const AdminUsersPage: NextPage = () => {
  const router = useRouter();
  const loggedIn = useBoundStore((x) => x.loggedIn);
  const hasHydrated = useBoundStore((x) => x.hasHydrated);

  useEffect(() => {
    if (hasHydrated && !loggedIn) void router.replace("/?login");
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
      void refetch();
    } catch (error) {
      window.alert(getErrorMessage(error, "Could not delete this user."));
    } finally {
      setDeletingId(null);
    }
  };

  if (!hasHydrated || !loggedIn) return null;

  return (
    <div>
      <TopBar />
      <LeftBar selectedTab="Admin" />
      <BottomBar selectedTab="Admin" />
      <div className="mx-auto flex flex-col gap-5 px-4 py-20 sm:py-10 md:pl-28 lg:pl-72">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between lg:max-w-4xl">
          <div>
            <h1 className="text-lg font-bold text-gray-800 sm:text-2xl">Users</h1>
            <p className="text-sm text-gray-500">Manage users and their roles</p>
          </div>
          <button
            className="rounded-2xl border-b-4 border-blue-600 bg-blue-500 px-5 py-3 font-bold uppercase text-white transition hover:brightness-110"
            onClick={openCreateForm}
          >
            New user
          </button>
        </div>

        <div className="flex justify-center gap-12">
          <div className="flex w-full max-w-xl flex-col gap-4 lg:max-w-4xl">
            <div className="flex flex-wrap items-center gap-3">
              <input
                className="w-56 rounded-xl border-2 border-gray-200 px-4 py-2 text-sm placeholder:text-gray-400"
                placeholder="Search users"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
              />
              <select
                className="rounded-xl border-2 border-gray-200 px-4 py-2 text-sm text-gray-700"
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
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                {getErrorMessage(usersError, "Failed to load users.")}
              </div>
            )}

            <div className="overflow-x-auto rounded-2xl border-2 border-gray-100">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-100 text-xs uppercase text-gray-400">
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersLoading ? (
                    <tr>
                      <td className="py-6 text-center text-gray-400" colSpan={4}>
                        Loading users...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td className="py-6 text-center text-gray-400" colSpan={4}>
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="border-b border-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-800">{user.name}</div>
                          <div className="text-xs text-gray-500">@{user.username}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{user.email}</td>
                        <td className="px-4 py-3">
                          {user.role ? (
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                              {user.role.name}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">No role</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                              onClick={() => openEditForm(user)}
                            >
                              Edit
                            </button>
                            <button
                              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                              onClick={() => void handleDelete(user)}
                              disabled={deletingId === user.id}
                            >
                              {deletingId === user.id ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Previous
              </button>
              <button
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasNextPage}
              >
                Next
              </button>
            </div>
          </div>
          {/* <AdminRightNav selectedTab="Users" /> */}
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-gray-900">
              {isEditing ? "Edit user" : "Create user"}
            </h2>
            <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
              <input
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm"
                placeholder="Username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
              <input
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm"
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <input
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm"
                placeholder="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
              <input
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm"
                placeholder={isEditing ? "New password (optional)" : "Password"}
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required={!isEditing}
              />
              <select
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700"
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

              {errorMessage && (
                <p className="text-sm font-bold text-red-500">{errorMessage}</p>
              )}

              <div className="mt-2 flex justify-end gap-3">
                <button
                  type="button"
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  onClick={() => setIsFormOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-50"
                  disabled={saving}
                >
                  {saving ? "Saving..." : isEditing ? "Save changes" : "Create user"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
