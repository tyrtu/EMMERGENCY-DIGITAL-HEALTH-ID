import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole?: "patient" | "medic";
}

export default function ProtectedRoute({ children, allowedRole }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();

  console.log("[ROUTE] guard", {
    allowedRole,
    hasUser: !!user,
    role,
    loading,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Role can be temporarily null while backend profile/role is being ensured.
  if (allowedRole && !role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (allowedRole && role !== allowedRole) {
    const redirect = role === "medic" ? "/medic-dashboard" : "/patient/dashboard";
    return <Navigate to={redirect} replace />;
  }

  return <>{children}</>;
}
