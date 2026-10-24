import React from "react";

export const FormField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
    {children}
  </div>
);
