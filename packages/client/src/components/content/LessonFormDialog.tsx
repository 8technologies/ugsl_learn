import React, { useEffect, useState } from "react";
import { useMutation } from "@apollo/client/react";
import { toast } from "sonner";
import { CONTENT_STATUSES, statusLabel } from "~/components/content/StatusPill";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { FormField } from "~/components/ui/form-field";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { SAVE_LESSON } from "~/gql/lessons";

export type LessonFormValues = {
  id: string;
  title: string;
  description: string | null;
  sequence: number;
  xpReward: number;
  status: string;
};

type SaveLessonResult = { saveLessons: { success: boolean; message: string } };

const selectClass = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900";

// Create (lesson = null) or edit a lesson inside a module
export const LessonFormDialog = ({
  open,
  onOpenChange,
  moduleId,
  lesson,
  nextSequence,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: number;
  lesson: LessonFormValues | null;
  nextSequence: number;
  onSaved: (message: string) => void;
}) => {
  const [form, setForm] = useState({ title: "", description: "", xpReward: "50", status: "draft" });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveLesson, { loading: saving }] = useMutation<SaveLessonResult>(SAVE_LESSON);

  useEffect(() => {
    if (!open) return;
    setForm(
      lesson
        ? {
            title: lesson.title,
            description: lesson.description ?? "",
            xpReward: String(lesson.xpReward),
            status: lesson.status,
          }
        : { title: "", description: "", xpReward: "50", status: "draft" },
    );
    setErrorMessage(null);
  }, [open, lesson]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      const { data } = await saveLesson({
        variables: {
          input: {
            ...(lesson ? { id: lesson.id } : { sequence: nextSequence }),
            moduleId,
            title: form.title.trim(),
            description: form.description.trim() || null,
            xpReward: Number(form.xpReward),
            status: form.status,
          },
        },
      });

      if (!data?.saveLessons.success) {
        setErrorMessage(data?.saveLessons.message || "Could not save this lesson.");
        return;
      }

      onOpenChange(false);
      toast.success(data.saveLessons.message);
      onSaved(data.saveLessons.message);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not save this lesson.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{lesson ? "Edit lesson" : "New lesson"}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
            <FormField label="Title">
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. M – R"
                maxLength={150}
                required
              />
            </FormField>
            <FormField label="Description">
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What this lesson teaches"
                maxLength={500}
                rows={3}
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="XP reward">
                <Input
                  type="number"
                  min={0}
                  value={form.xpReward}
                  onChange={(e) => setForm({ ...form, xpReward: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Status">
                <select
                  className={`${selectClass} capitalize`}
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {CONTENT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {statusLabel(status)}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            {errorMessage && <p className="text-sm font-semibold text-red-500">{errorMessage}</p>}

            <DialogFooter className="mt-2 gap-3">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-50"
              >
                {saving ? "Saving…" : lesson ? "Save changes" : "Add lesson"}
              </button>
            </DialogFooter>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};
