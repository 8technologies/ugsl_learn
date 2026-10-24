// Content workflow statuses, in the order an item moves through them
export const CONTENT_STATUSES = ["draft", "in_review", "published", "archived"] as const;

export const statusLabel = (status: string) => status.replace(/_/g, " ");

// Pill colours for each status: [background + text, dot]
const statusStyles: Record<string, [string, string]> = {
  published: ["bg-emerald-50 text-emerald-700", "bg-emerald-500"],
  draft: ["bg-stone-200/70 text-stone-700", "bg-stone-500"],
  in_review: ["bg-amber-50 text-amber-700", "bg-amber-500"],
  archived: ["bg-gray-100 text-gray-500", "bg-gray-400"],
};

export const StatusPill = ({ status }: { status: string }) => {
  const [pill, dot] = statusStyles[status] ?? ["bg-stone-200/70 text-stone-700", "bg-stone-500"];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${pill}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {statusLabel(status)}
    </span>
  );
};
