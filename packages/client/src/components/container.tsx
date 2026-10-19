import React, { type PropsWithChildren } from "react";

export const Container = ({
  className = "",
  children,
}: PropsWithChildren<{ className?: string }>) => (
  <div className={["mx-auto w-full max-w-5xl px-4", className].join(" ")}>
    {children}
  </div>
);
