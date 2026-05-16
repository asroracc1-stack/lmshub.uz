/**
 * 🚨 SUPABASE IS DISABLED.
 * This file is kept only to prevent compilation errors in legacy components.
 * Do not use for new features. All auth/data should go through Java Backend (Axios).
 */
export const supabase = {
  auth: {
    signInWithPassword: async () => {
      console.error("❌ ERROR: Supabase is disabled. Use Java Backend API.");
      return { data: { user: null, session: null }, error: new Error("Supabase is disabled") };
    },
    signOut: async () => {
      console.warn("Supabase signOut called (ignored)");
      return { error: null };
    },
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data: null, error: null }),
        single: async () => ({ data: null, error: null }),
      }),
    }),
  }),
  storage: {
    from: () => ({
      getPublicUrl: () => ({ data: { publicUrl: "" } }),
    })
  }
} as any;