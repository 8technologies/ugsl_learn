import clsx from "clsx";
import { useEffect } from "react";
import { Container } from "@/components/container";
import { HeaderLogo, HeaderTopbar } from "./";
import { Breadcrumbs, useDemo1Layout } from "../";
import { KeenIcon } from "@/components/keenicons";
import { useLocation } from "react-router";

const Header = () => {
  const { headerSticky } = useDemo1Layout();
  const { pathname } = useLocation();

  useEffect(() => {
    if (headerSticky) {
      document.body.setAttribute("data-sticky-header", "on");
    } else {
      document.body.removeAttribute("data-sticky-header");
    }
  }, [headerSticky]);

  const SearchBar = () => (
    <div className="hidden lg:flex items-center w-full max-w-[520px] mx-4">
      <label className="input w-full bg-gray-50 border-gray-200 focus-within:ring-2 focus-within:ring-orange-200 rounded-xl">
        <KeenIcon icon="search-list" className="text-gray-400" />
        <input
          placeholder="Search signs, lessons…"
          className="form-control placeholder:text-gray-400 text-gray-900 bg-transparent"
          // readOnly
        />
      </label>
    </div>
  );

  return (
    <header
      className={clsx(
        // White header with a grey bottom border, like the learner app
        "header fixed top-0 z-10 start-0 end-0 flex items-stretch shrink-0 bg-white text-gray-900 border-b border-gray-200",
        headerSticky && "shadow-sm",
      )}
    >
      <Container className="flex justify-between items-center lg:gap-4">
        <HeaderLogo />
        {pathname.includes("/account") ? <Breadcrumbs /> : <Breadcrumbs />}
        <HeaderTopbar />
      </Container>
    </header>
  );
};

export { Header };
