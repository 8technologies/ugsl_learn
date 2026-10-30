import React from "react";

// A label above a form control, used by the content and user forms
export const FormField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
    {children}
  </div>
);
