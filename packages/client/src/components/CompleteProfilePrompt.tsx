import React, { useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { useBoundStore } from "~/hooks/useBoundStore";
import { MY_LEARNER_PROFILE } from "~/gql/queries";
import { SAVE_LEARNER } from "~/gql/mutations";

type MyLearnerProfileResult = {
  user: { id: string; role: { id: string; name: string } | null } | null;
  learner: { id: string } | null;
};

type SaveLearnerResult = {
  SaveLearner: { success: boolean; message: string | null };
};

export const HEARING_STATUS_OPTIONS = [
  { value: "deaf", label: "Deaf" },
  { value: "hard_of_hearing", label: "Hard of hearing" },
  { value: "hearing", label: "Hearing" },
];

export const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "lg", label: "Luganda" },
  { value: "sw", label: "Swahili" },
];

const selectClass =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none";

// Asks a signed-in Learner with no learner profile to create one.
export const CompleteProfilePrompt = () => {
  const userId = useBoundStore((x) => x.id);
  const [dismissed, setDismissed] = useState(false);
  const [hearingStatus, setHearingStatus] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("en");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data, refetch } = useQuery<MyLearnerProfileResult>(MY_LEARNER_PROFILE, {
    variables: { userId },
    skip: !userId,
    fetchPolicy: "network-only",
  });
  const [saveLearner, { loading }] = useMutation<SaveLearnerResult>(SAVE_LEARNER);

  const isLearner = data?.user?.role?.name?.toLowerCase() === "learner";
  const needsProfile = Boolean(data) && isLearner && !data?.learner;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!hearingStatus) {
      setErrorMessage("Select your hearing status.");
      return;
    }

    try {
      const { data: result } = await saveLearner({
        variables: { input: { hearingStatus, preferredLanguage } },
      });
      if (!result?.SaveLearner.success) {
        setErrorMessage(result?.SaveLearner.message || "Could not save your profile.");
        return;
      }
      await refetch();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not save your profile.",
      );
    }
  };

  return (
    <Dialog open={needsProfile && !dismissed} onOpenChange={() => setDismissed(true)}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Complete your profile</DialogTitle>
          <p className="mt-1 text-sm text-gray-500">
            Tell us a little about yourself so we can tailor your UGSL lessons.
          </p>
        </DialogHeader>
        <DialogBody>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Hearing status
                </label>
                <select
                  className={selectClass}
                  value={hearingStatus}
                  onChange={(e) => setHearingStatus(e.target.value)}
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
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Preferred language
                </label>
                <select
                  className={selectClass}
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                >
                  {LANGUAGE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
            </div>
            <DialogFooter className="mt-6 flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setDismissed(true)}
              >
                Later
              </Button>
              <Button type="submit" variant="default" className="flex-1" disabled={loading}>
                {loading ? "Please wait..." : "Save profile"}
              </Button>
            </DialogFooter>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};
