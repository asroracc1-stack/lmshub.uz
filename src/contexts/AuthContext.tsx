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
}

interface AuthContextValue {
  session: any | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  setAuth: (token: string, user: any) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<any | null>(null);
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
    if (r === 'manager') return 'payment_manager';
    return 'user';
  };

  const setAuth = (token: string, userData: any) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setRole(mapBackendRole(userData.role));
    setSession({ access_token: token });
    
    const firstName = userData.firstName || userData.first_name || '';
    const lastName = userData.lastName || userData.last_name || '';

    setProfile({
      id: userData.id,
      username: userData.username || userData.email.split('@')[0],
      full_name: `${firstName} ${lastName}`.trim(),
      email: userData.email,
      avatar_url: userData.avatarUrl || userData.avatar_url,
    } as any);
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
         const mappedProfile = {
           ...res.data,
           full_name: res.data.fullName || res.data.full_name,
           avatar_url: res.data.avatarUrl || res.data.avatar_url,
         };
         setProfile(mappedProfile);
         
         // Also update localStorage user object if it exists
         const savedUser = localStorage.getItem('user');
         if (savedUser) {
           const userData = JSON.parse(savedUser);
           userData.avatarUrl = mappedProfile.avatar_url;
           localStorage.setItem('user', JSON.stringify(userData));
         }
       } catch (e) {
         console.error("Profile refresh failed", e);
       }
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          setRole(mapBackendRole(userData.role));
          setSession({ access_token: token });
          
          const firstName = userData.firstName || userData.first_name || '';
          const lastName = userData.lastName || userData.last_name || '';

          setProfile({
            id: userData.id,
            username: userData.username || userData.email.split('@')[0],
            full_name: `${firstName} ${lastName}`.trim(),
            email: userData.email,
            avatar_url: userData.avatarUrl || userData.avatar_url,
          } as any);
          
          // Trigger a background refresh to get the latest from DB
          refresh();
        } catch (e) {
          console.error("Init auth failed", e);
          signOut();
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
