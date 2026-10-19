import React, { type TextareaHTMLAttributes } from "react";

export const Textarea = ({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) => {
  return (
    <textarea
      className={[
        "w-full rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400",
        className,
      ].join(" ")}
      {...props}
    />
  );
};
