import React, { type HTMLAttributes } from "react";

export const Skeleton = ({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={["animate-pulse rounded-md bg-gray-200", className].join(" ")}
      {...props}
    />
  );
};
