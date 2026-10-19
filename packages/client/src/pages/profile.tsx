import type { NextPage } from "next";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { toast } from "sonner";
import { Flame, Heart, LogOut, Trophy, Zap } from "lucide-react";
import { AppShell } from "~/components/AppShell";
import {
  HEARING_STATUS_OPTIONS,
  LANGUAGE_OPTIONS,
} from "~/components/CompleteProfilePrompt";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useBoundStore } from "~/hooks/useBoundStore";
import { useLogout } from "~/hooks/useLogout";
import { MY_PROFILE } from "~/gql/queries";
import { SAVE_LEARNER, UPDATE_ME } from "~/gql/mutations";

type MyProfileResult = {
  user: {
    id: string;
    email: string;
    username: string;
    name: string;
    createdAt: string;
    role: { id: string; name: string } | null;
  } | null;
  learner: {
    id: string;
    hearingStatus: string | null;
    preferredLanguage: string | null;
    stats: {
      totalXp: number;
      currentStreak: number;
      longestStreak: number;
      hearts: number;
    } | null;
  } | null;
};

type UpdateMeResult = {
  updateMe: {
    success: boolean;
    message: string | null;
    user: { id: string; email: string; username: string; name: string } | null;
  };
};

type SaveLearnerResult = {
  SaveLearner: { success: boolean; message: string | null };
};

const selectClass =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none";

const labelFor = (options: { value: string; label: string }[], value?: string | null) =>
  options.find((o) => o.value === value)?.label ?? "Not set";

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong. Please try again.";

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-gray-200 bg-white p-6">
    <h2 className="mb-4 text-lg font-bold text-gray-900">{title}</h2>
    {children}
  </section>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
    {children}
  </div>
);

const ProfilePage: NextPage = () => {
  const router = useRouter();
  const loggedIn = useBoundStore((x) => x.loggedIn);
  const hasHydrated = useBoundStore((x) => x.hasHydrated);
  const userId = useBoundStore((x) => x.id);
  const token = useBoundStore((x) => x.token);
  const setAuthenticatedUser = useBoundStore((x) => x.setAuthenticatedUser);
  const logout = useLogout();

  useEffect(() => {
    if (hasHydrated && !loggedIn) void router.replace("/login");
  }, [hasHydrated, loggedIn, router]);

  const { data, loading, refetch } = useQuery<MyProfileResult>(MY_PROFILE, {
    variables: { userId },
    skip: !userId,
    fetchPolicy: "network-only",
  });
  const [updateMe, { loading: savingAccount }] = useMutation<UpdateMeResult>(UPDATE_ME);
  const [saveLearner, { loading: savingLearner }] = useMutation<SaveLearnerResult>(SAVE_LEARNER);

  const user = data?.user;
  const learner = data?.learner;
  const isLearner = user?.role?.name?.toLowerCase() === "learner";

  const [account, setAccount] = useState({ name: "", username: "" });
  const [learnerForm, setLearnerForm] = useState({ hearingStatus: "", preferredLanguage: "en" });

  // Fill the forms once the profile loads
  useEffect(() => {
    if (user) setAccount({ name: user.name, username: user.username });
  }, [user?.name, user?.username]);
  useEffect(() => {
    setLearnerForm({
      hearingStatus: learner?.hearingStatus ?? "",
      preferredLanguage: learner?.preferredLanguage ?? "en",
    });
  }, [learner?.hearingStatus, learner?.preferredLanguage]);

  if (!hasHydrated || !loggedIn) return null;

  const accountChanged =
    !!user && (account.name.trim() !== user.name || account.username.trim() !== user.username);

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !accountChanged) return;
    try {
      const { data: result } = await updateMe({
        variables: {
          input: {
            ...(account.name.trim() !== user.name ? { name: account.name } : {}),
            ...(account.username.trim() !== user.username ? { username: account.username } : {}),
          },
        },
      });
      const updated = result?.updateMe.user;
      if (!result?.updateMe.success || !updated) {
        toast.error(result?.updateMe.message || "Could not update your account.");
        return;
      }
      // Keep the sidebar and stored session in sync with the new name
      if (token) setAuthenticatedUser({ token, user: updated });
      toast.success("Account updated");
      await refetch();
    } catch (error) {
      toast.error(errorText(error));
    }
  };

  const handleLearnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!learnerForm.hearingStatus) {
      toast.error("Select your hearing status.");
      return;
    }
    try {
      const { data: result } = await saveLearner({
        variables: { input: { id: learner?.id, ...learnerForm } },
      });
      if (!result?.SaveLearner.success) {
        toast.error(result?.SaveLearner.message || "Could not save your learner profile.");
        return;
      }
      toast.success("Learner profile saved");
      await refetch();
    } catch (error) {
      toast.error(errorText(error));
    }
  };

  const stats = learner?.stats;
  const statTiles = [
    { label: "Total XP", value: stats?.totalXp ?? 0, icon: Zap },
    { label: "Day streak", value: stats?.currentStreak ?? 0, icon: Flame },
    { label: "Longest streak", value: stats?.longestStreak ?? 0, icon: Trophy },
    { label: "Hearts", value: stats?.hearts ?? 5, icon: Heart },
  ];

  const initial = (user?.name || user?.username || "?").charAt(0).toUpperCase();
  const joined = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : null;

  return (
    <AppShell>
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <section className="flex flex-col gap-5 rounded-2xl bg-[#2b2f5c] p-6 text-white sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-orange-500 text-3xl font-bold">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold">{user?.name ?? (loading ? "Loading…" : "")}</h1>
            <div className="text-sm text-indigo-200">@{user?.username}</div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {user?.role && (
                <span className="rounded-full bg-white/10 px-2.5 py-1">{user.role.name}</span>
              )}
              {joined && <span className="rounded-full bg-white/10 px-2.5 py-1">Joined {joined}</span>}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="flex items-center gap-2 self-start rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold transition hover:bg-white/10 sm:self-center"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </section>

        {isLearner && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {statTiles.map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-xl border border-gray-200 bg-white px-5 py-4">
                <Icon className="mb-2 h-5 w-5 text-orange-500" />
                <div className="text-2xl font-bold text-gray-900">{value}</div>
                <div className="text-xs font-medium text-gray-500">{label}</div>
              </div>
            ))}
          </div>
        )}

        <Card title="Account">
          <form onSubmit={handleAccountSubmit} className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <Input
                value={account.name}
                onChange={(e) => setAccount((prev) => ({ ...prev, name: e.target.value }))}
                maxLength={100}
                required
              />
            </Field>
            <Field label="Username">
              <Input
                value={account.username}
                onChange={(e) => setAccount((prev) => ({ ...prev, username: e.target.value }))}
                required
              />
            </Field>
            <Field label="Email">
              <Input value={user?.email ?? ""} disabled readOnly />
            </Field>
            <div className="flex items-end justify-end">
              <Button type="submit" disabled={!accountChanged || savingAccount}>
                {savingAccount ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </Card>

        {isLearner && (
          <Card title="Learner profile">
            <form onSubmit={handleLearnerSubmit} className="grid gap-4 sm:grid-cols-2">
              <Field label="Hearing status">
                <select
                  className={selectClass}
                  value={learnerForm.hearingStatus}
                  onChange={(e) => setLearnerForm((prev) => ({ ...prev, hearingStatus: e.target.value }))}
                  required
                >
                  <option value="" disabled>
                    Select one
                  </option>
                  {HEARING_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Preferred language">
                <select
                  className={selectClass}
                  value={learnerForm.preferredLanguage}
                  onChange={(e) =>
                    setLearnerForm((prev) => ({ ...prev, preferredLanguage: e.target.value }))
                  }
                >
                  {LANGUAGE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <p className="text-sm text-gray-500 sm:col-span-2">
                {learner
                  ? `Currently: ${labelFor(HEARING_STATUS_OPTIONS, learner.hearingStatus)} · ${labelFor(LANGUAGE_OPTIONS, learner.preferredLanguage)}`
                  : "You haven't set up your learner profile yet."}
              </p>
              <div className="flex justify-end sm:col-span-2">
                <Button type="submit" disabled={savingLearner}>
                  {savingLearner ? "Saving…" : learner ? "Save learner profile" : "Create learner profile"}
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </AppShell>
  );
};

export default ProfilePage;
