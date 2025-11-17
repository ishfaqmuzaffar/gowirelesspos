import { Navigate, Outlet } from "react-router-dom";
import { getPosContext } from "../posContext";


export default function PosRoute() {
  const ctx = getPosContext();

  // If store/register not selected → redirect user
  if (!ctx || !ctx.store || !ctx.register) {
    return <Navigate to="/select-register" replace />;
  }

  // Allowed → render the page inside this protected route
  return <Outlet />;
}
