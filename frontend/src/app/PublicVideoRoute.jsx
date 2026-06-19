import { useAuth } from "../auth/AuthContext";

export default function PublicVideoRoute({ children }) {
  const { loading } = useAuth();

  if (loading) return null;

  return children;
}
