import React, { type PropsWithChildren } from "react";

export const Dialog = ({
  open,
  onOpenChange,
  children,
}: PropsWithChildren<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={() => onOpenChange(false)}
    >
      {children}
    </div>
  );
};

export const DialogContent = ({
  className = "",
  children,
}: PropsWithChildren<{ className?: string }>) => {
  return (
    <div
      className={["w-full rounded-2xl bg-white p-6 shadow-xl", className].join(" ")}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
};

export const DialogHeader = ({ children }: PropsWithChildren) => (
  <div className="mb-4">{children}</div>
);

export const DialogTitle = ({ children }: PropsWithChildren) => (
  <h2 className="text-xl font-bold text-gray-900">{children}</h2>
);

export const DialogBody = ({ children }: PropsWithChildren) => <div>{children}</div>;

export const DialogFooter = ({
  className = "",
  children,
}: PropsWithChildren<{ className?: string }>) => (
  <div className={["flex justify-end", className].join(" ")}>{children}</div>
);
