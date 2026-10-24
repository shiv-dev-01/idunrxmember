import React from "react";
import { Link } from "react-router-dom";
import logo from "../../assets/img/logo.png";

export function Logo() {
  return (
    <Link
      to="https://idunrx.com/"
      target="_blank"
      className="flex items-center"
    >
      <img src={logo} alt="idunrx" className=" h-16 w-auto md:h-16 logo_my" />
    </Link>
  );
}
