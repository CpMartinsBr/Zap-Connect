import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import type { User, Company, MembershipWithCompany } from "@shared/schema";

type AuthUser = User & { 
  isAllowed?: boolean;
  isSuperAdmin?: boolean;
  company?: Company | null;
  memberships?: MembershipWithCompany[];
  activeRole?: string | null;
};

export function useAuth() {
  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: Infinity,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAllowed: user?.isAllowed ?? false,
  };
}
