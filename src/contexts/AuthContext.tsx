import { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react";
import { AppRole } from "@/lib/auth";
import { toast } from "sonner";
import { api } from "@/lib/axios";

interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  organization_id: string | null;
  telegram_username?: string | null;
  payment_card_number?: string | null;
  payment_card_owner?: string | null;
  coins?: number | null;
  exam_date?: string | null;
  last_login_at?: string | null;
}

interface User {
  id: string;
  email: string;
  role: string;
  username?: string;
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  avatarUrl?: string;
  avatar_url?: string;
  organizationId?: string | null;
  organization_id?: string | null;
  phone?: string | null;
}

interface Session {
  access_token: string;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  setAuth: (token: string, user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const loadedUid = useRef<string | null>(null);

  const mapBackendRole = (backendRole: string): AppRole => {
    const r = (backendRole || '').toLowerCase();
    if (r === 'super_admin') return 'super_admin';
    if (r === 'admin') return 'admin';
    if (r === 'administrator') return 'administrator';
    if (r === 'teacher') return 'teacher';
    if (r === 'student') return 'student';
    if (r === 'parent') return 'parent';
    if (r === 'manager' || r === 'payment_manager' || r === 'pack_manager') return 'payment_manager';
    return 'user';
  };

  const setAuth = (token: string, userData: User) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setRole(mapBackendRole(userData.role));
    setSession({ access_token: token });
    
    const firstName = userData.firstName || userData.first_name || '';
    const lastName = userData.lastName || userData.last_name || '';

    setProfile({
      id: userData.id,
      username: userData.username || userData.email?.split('@')[0] || '',
      full_name: `${firstName} ${lastName}`.trim(),
      email: userData.email,
      phone: userData.phone || null,
      avatar_url: userData.avatarUrl || userData.avatar_url || null,
      organization_id: userData.organizationId || userData.organization_id || null,
    });
  };

  const signOut = async () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    localStorage.removeItem('smart-clock-settings');
    localStorage.removeItem('sidebar_collapsed_admin');
    setUser(null);
    setProfile(null);
    setRole(null);
    setSession(null);
    loadedUid.current = null;
    window.location.href = '/auth';
  };

  const refresh = async () => {
    const token = localStorage.getItem('access_token');
    if (token) {
       try {
         const res = await api.get('/user/profile');
         const mappedProfile: Profile = {
           id: res.data.id || '',
           username: res.data.username || '',
           full_name: res.data.fullName || res.data.full_name || null,
           email: res.data.email || null,
           phone: res.data.phone || res.data.phoneNumber || res.data.phone_number || null,
           avatar_url: res.data.avatarUrl || res.data.avatar_url || null,
           organization_id: res.data.organizationId || res.data.organization_id || null,
         };
         setProfile(mappedProfile);
         
         // Also update localStorage user object if it exists
         const savedUser = localStorage.getItem('user');
         if (savedUser) {
           const userData = JSON.parse(savedUser) as User;
           userData.avatarUrl = mappedProfile.avatar_url || undefined;
           userData.organizationId = mappedProfile.organization_id;
           localStorage.setItem('user', JSON.stringify(userData));
         }
       } catch (e: any) {
         const status = e?.response?.status;
         // Token is invalid or expired — force re-login
         if (status === 401 || status === 403) {
           console.warn("Session expired or unauthorized. Signing out.");
           signOut();
         } else {
           console.error("Profile refresh failed", e);
         }
       }
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        try {
          const userData = JSON.parse(savedUser) as User;
          setUser(userData);
          setRole(mapBackendRole(userData.role));
          setSession({ access_token: token });
          
          const firstName = userData.firstName || userData.first_name || '';
          const lastName = userData.lastName || userData.last_name || '';

          setProfile({
            id: userData.id,
            username: userData.username || userData.email?.split('@')[0] || '',
            full_name: `${firstName} ${lastName}`.trim(),
            email: userData.email,
            phone: userData.phone || null,
            avatar_url: userData.avatarUrl || userData.avatar_url || null,
            organization_id: userData.organizationId || userData.organization_id || null,
          });
          
          // Verify token is still valid on server side
          try {
            const res = await api.get('/user/profile');
            const refreshedProfile: Profile = {
              id: res.data.id || '',
              username: res.data.username || '',
              full_name: res.data.fullName || res.data.full_name || null,
              email: res.data.email || null,
              phone: res.data.phone || res.data.phoneNumber || res.data.phone_number || null,
              avatar_url: res.data.avatarUrl || res.data.avatar_url || null,
              organization_id: res.data.organizationId || res.data.organization_id || null,
            };
            setProfile(refreshedProfile);
          } catch (refreshErr: any) {
            const status = refreshErr?.response?.status;
            if (status === 401 || status === 403) {
              console.warn("Token rejected by server, signing out.");
              signOut();
              return;
            }
          }
        } catch (e) {
          console.error("Init auth failed", e);
          signOut();
          return;
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, profile, role, loading, signOut, refresh, setAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
