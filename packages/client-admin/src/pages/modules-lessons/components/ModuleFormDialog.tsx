import React, { useEffect, useState } from "react";
import { useMutation } from "@apollo/client/react";
import { toast } from "sonner";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SAVE_MODULE } from "@/gql/content";
import { CONTENT_STATUSES, statusLabel } from "./StatusPill";

export type ModuleFormValues = {
  id: string;
  levelId: number;
  title: string;
  description: string | null;
  sequence: number;
  xpReward: number;
  status: string;
};

type SaveModuleResult = { saveModule: { success: boolean; message: string } };

type FormState = {
  levelId: string;
  title: string;
  description: string;
  sequence: string;
  xpReward: string;
  status: string;
};

const selectClass = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900";

const toFormState = (module: ModuleFormValues | null, defaultLevelId: string): FormState =>
  module
    ? {
        levelId: String(module.levelId),
        title: module.title,
        description: module.description ?? "",
        sequence: String(module.sequence),
        xpReward: String(module.xpReward),
        status: module.status,
      }
    : { levelId: defaultLevelId, title: "", description: "", sequence: "", xpReward: "50", status: "draft" };

// Create (module = null) or edit a module
export const ModuleFormDialog = ({
  open,
  onOpenChange,
  module,
  levels,
  defaultLevelId = "",
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: ModuleFormValues | null;
  levels: { id: string; name: string }[];
  defaultLevelId?: string;
  onSaved: () => void;
}) => {
  const [form, setForm] = useState<FormState>(() => toFormState(module, defaultLevelId));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveModule, { loading: saving }] = useMutation<SaveModuleResult>(SAVE_MODULE);

  // Refill the form each time the dialog opens
  useEffect(() => {
    if (open) {
      setForm(toFormState(module, defaultLevelId));
      setErrorMessage(null);
    }
  }, [open, module, defaultLevelId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!form.levelId) {
      setErrorMessage("Select a level.");
      return;
    }

    try {
      const { data } = await saveModule({
        variables: {
          input: {
            ...(module ? { id: module.id } : {}),
            levelId: Number(form.levelId),
            title: form.title.trim(),
            description: form.description.trim() || null,
            sequence: Number(form.sequence),
            xpReward: Number(form.xpReward),
            status: form.status,
          },
        },
      });

      if (!data?.saveModule.success) {
        setErrorMessage(data?.saveModule.message || "Could not save this module.");
        return;
      }

      onOpenChange(false);
      toast.success(data.saveModule.message);
      onSaved();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not save this module.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{module ? "Edit module" : "New module"}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
            <FormField label="Level">
              <select
                className={selectClass}
                value={form.levelId}
                onChange={(e) => setForm({ ...form, levelId: e.target.value })}
                required
              >
                <option value="">Select level</option>
                {levels.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Title">
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Alphabet"
                maxLength={150}
                required
              />
            </FormField>
            <FormField label="Description">
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What learners will cover in this module"
                maxLength={500}
                rows={3}
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="Order">
                <Input
                  type="number"
                  min={1}
                  value={form.sequence}
                  onChange={(e) => setForm({ ...form, sequence: e.target.value })}
                  placeholder="1"
                  required
                />
              </FormField>
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

            {levels.length === 0 && (
              <p className="text-sm text-amber-600">Create a level first — every module belongs to one.</p>
            )}
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
                {saving ? "Saving…" : module ? "Save changes" : "Create module"}
              </button>
            </DialogFooter>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};
