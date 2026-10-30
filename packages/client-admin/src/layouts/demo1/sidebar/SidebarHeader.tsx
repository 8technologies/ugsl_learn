import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { useDemo1Layout } from "../";
import { SidebarToggle } from "./";

// UGSL Learn brand mark, same as the learner app's sidebar. `default-logo`
// shows when the sidebar is open and `small-logo` when it's collapsed.
const UgslLogo = ({ dark }: { dark: boolean }) => (
  <Link to="/" className="flex items-center gap-2">
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500 font-bold text-white small-logo">
      U
    </span>
    <span className="default-logo flex items-center gap-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500 font-bold text-white">
        U
      </span>
      <span className={`text-lg font-bold ${dark ? "text-white" : "text-gray-900"}`}>
        UGSL <span className="text-orange-400">Learn</span>
        <span className={`block text-[11px] font-medium leading-none ${dark ? "text-gray-400" : "text-gray-500"}`}>
          Admin
        </span>
      </span>
    </span>
  </Link>
);

const SidebarHeader = forwardRef<HTMLDivElement, any>((props, ref) => {
  const { layout } = useDemo1Layout();

  return (
    <div
      ref={ref}
      className="sidebar-header hidden lg:flex items-center relative justify-between px-3 lg:px-6 shrink-0"
    >
      <UgslLogo dark={layout.options.sidebar.theme !== "light"} />
      <SidebarToggle />
    </div>
  );
});

export { SidebarHeader };
