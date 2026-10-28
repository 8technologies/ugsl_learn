import React, { useEffect, useState } from "react";
import { useMutation } from "@apollo/client/react";
import { toast } from "sonner";
import { Video } from "lucide-react";
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
import { SAVE_UNIT } from "@/gql/content";
import { CONTENT_STATUSES, statusLabel } from "./StatusPill";

export type UnitFormValues = {
  id: string;
  title: string;
  description: string | null;
  mediaRef: string | null;
  status: string;
};

type SaveUnitResult = { saveUnit: { success: boolean; message: string } };

// Matches the server's limit for unit videos
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

const selectClass = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900";

// Create (unit = null) or edit a unit, optionally uploading its sign video.
// The admin's Apollo client uses an upload link, so a File in the variables
// is sent as a multipart request.
export const UnitFormDialog = ({
  open,
  onOpenChange,
  lessonId,
  unit,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonId: number;
  unit: UnitFormValues | null;
  onSaved: () => void;
}) => {
  const [form, setForm] = useState({ title: "", description: "", status: "draft" });
  const [video, setVideo] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveUnit, { loading: saving }] = useMutation<SaveUnitResult>(SAVE_UNIT);

  useEffect(() => {
    if (!open) return;
    setForm(
      unit
        ? { title: unit.title, description: unit.description ?? "", status: unit.status }
        : { title: "", description: "", status: "draft" },
    );
    setVideo(null);
    setErrorMessage(null);
  }, [open, unit]);

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file && file.size > MAX_VIDEO_BYTES) {
      setErrorMessage("The video must be 50 MB or smaller.");
      e.target.value = "";
      return;
    }
    setErrorMessage(null);
    setVideo(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      const { data } = await saveUnit({
        variables: {
          input: {
            ...(unit ? { id: unit.id } : {}),
            lessonId,
            title: form.title.trim(),
            description: form.description.trim() || null,
            status: form.status,
            // Only sent when a new file was chosen; leaving it out keeps the current video
            ...(video ? { video } : {}),
          },
        },
      });

      if (!data?.saveUnit.success) {
        setErrorMessage(data?.saveUnit.message || "Could not save this unit.");
        return;
      }

      onOpenChange(false);
      toast.success(data.saveUnit.message);
      onSaved();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not save this unit.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{unit ? "Edit unit" : "New unit"}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
            <FormField label="Title">
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Letter M"
                maxLength={150}
                required
              />
            </FormField>
            <FormField label="Description">
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Handshape or movement notes"
                maxLength={500}
                rows={2}
              />
            </FormField>
            <FormField label="Sign video">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-600 transition hover:bg-gray-50">
                <Video className="h-5 w-5 shrink-0 text-gray-400" />
                <span className="min-w-0 flex-1 truncate">
                  {video
                    ? video.name
                    : unit?.mediaRef
                      ? "Has a video — choose a file to replace it"
                      : "Choose a video (MP4, WebM · up to 50 MB)"}
                </span>
                <input type="file" accept="video/*" className="sr-only" onChange={handleVideoChange} />
              </label>
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

            {errorMessage && <p className="text-sm font-semibold text-red-500">{errorMessage}</p>}

            <DialogFooter className="mt-2 gap-3">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={saving}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-50"
              >
                {saving ? (video ? "Uploading…" : "Saving…") : unit ? "Save changes" : "Add unit"}
              </button>
            </DialogFooter>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};
