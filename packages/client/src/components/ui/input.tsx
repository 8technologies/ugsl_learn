import React, { type InputHTMLAttributes } from "react";

export const Input = ({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) => {
  return (
    <input
      className={[
        "w-full rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400",
        className,
      ].join(" ")}
      {...props}
    />
  );
};
