import { Navigate, useLocation } from "react-router-dom";
import { getUser } from "./client";

export default function RequireAuth({ roles, children }) {
  const user = getUser();
  const token = localStorage.getItem("biverify_token");
  const location = useLocation();

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export function useLogout() {
  return () => {
    localStorage.removeItem("biverify_token");
    localStorage.removeItem("biverify_user");
    window.location.assign("/login");
  };
}
