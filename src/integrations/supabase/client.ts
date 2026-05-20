/**
 * 🚨 SUPABASE IS DISABLED.
 * This file is kept only to prevent compilation errors in legacy components.
 * Do not use for new features. All auth/data should go through Java Backend (Axios).
 */

const makeChainable = (promiseVal: any = { data: [], error: null }) => {
  const obj: any = {};
  const fn = () => new Proxy(obj, handler);
  
  const handler: ProxyHandler<any> = {
    get(target, prop) {
      if (prop === 'then') {
        return (resolve: any) => Promise.resolve(promiseVal).then(resolve);
      }
      return fn;
    }
  };
  
  return new Proxy(obj, handler);
};

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
  from: () => makeChainable(),
  storage: {
    from: () => ({
      getPublicUrl: () => ({ data: { publicUrl: "" } }),
    })
  },
  channel: () => makeChainable({}),
  removeChannel: () => {},
  rpc: () => Promise.resolve({ data: null, error: null }),
} as any;