import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, supabaseAdmin, AuthUser, AuthContextType } from '../services/supabaseClient';

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => undefined,
  signOut: async () => {},
  setUser: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setInternalUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const setUser = (newUser: AuthUser | null) => {
    console.log('AuthContext: Setting user to:', newUser);
    setInternalUser(newUser);
  };

  useEffect(() => {
    console.log('AuthContext: useEffect triggered');
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('AuthContext: Starting initializeAuth...');
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('AuthContext: Session check result:', { session, sessionError });

        if (sessionError) {
          console.error('AuthContext: Session error:', sessionError);
        }

        if (session?.user && mounted) {
          console.log('AuthContext: User found in session:', session.user);
          // קבלת הרול מהדאטאבייס עם timeout
          try {
            const rolePromise = supabaseAdmin
              .from('users')
              .select('role')
              .eq('id', session.user.id)
              .single();
            
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Role query timeout')), 5000)
            );
            
            const { data: userData, error: roleError } = await Promise.race([
              rolePromise,
              timeoutPromise
            ]) as any;

            console.log('AuthContext: Initial role check:', { userData, roleError });

            if (!roleError && mounted) {
              const newUser = {
                id: session.user.id,
                email: session.user.email,
                role: userData?.role || 'user'
              };
              console.log('AuthContext: Setting initial user:', newUser);
              setInternalUser(newUser);
            } else if (mounted) {
              console.error('AuthContext: Error getting initial role:', roleError);
              // אם יש שגיאה, נגדיר user עם role ברירת מחדל
              const fallbackUser = {
                id: session.user.id,
                email: session.user.email,
                role: 'user' as const
              };
              console.log('AuthContext: Setting fallback initial user:', fallbackUser);
              setInternalUser(fallbackUser);
            }
          } catch (roleTimeoutError) {
            console.error('AuthContext: Role query timeout, using fallback:', roleTimeoutError);
            const fallbackUser = {
              id: session.user.id,
              email: session.user.email,
              role: 'user' as const
            };
            console.log('AuthContext: Setting timeout fallback user:', fallbackUser);
            setInternalUser(fallbackUser);
          }
        } else {
          console.log('AuthContext: No user in session or not mounted');
        }
        if (mounted) {
          console.log('AuthContext: Setting loading to false');
          setLoading(false);
        }
      } catch (error) {
        console.error('AuthContext: Error in initializeAuth:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // נסה להתחיל את האתחול מיד
    initializeAuth();

    // Timeout fallback - אם אחרי 15 שניות עדיין loading, נעצור
    const timeoutId = setTimeout(() => {
      if (mounted) {
        console.log('AuthContext: Timeout reached, setting loading to false');
        setLoading(false);
      }
    }, 15000);

    // האזנה לשינויים בסשן
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      console.log('Auth state changed:', { event, session });
      if (session?.user && mounted) {
        try {
          // קבלת הרול מהדאטאבייס עם timeout
          const rolePromise = supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single();
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Role query timeout')), 5000)
          );
          
          const { data: userData, error: roleError } = await Promise.race([
            rolePromise,
            timeoutPromise
          ]) as any;

          console.log('Role check on auth change:', { userData, roleError });

          if (!roleError && mounted) {
            const newUser = {
              id: session.user.id,
              email: session.user.email,
              role: userData?.role || 'user'
            };
            console.log('Setting user on auth change:', newUser);
            setInternalUser(newUser);
          } else if (mounted) {
            console.error('Error getting role on auth change:', roleError);
            // אם יש שגיאה, נגדיר user עם role ברירת מחדל
            const fallbackUser = {
              id: session.user.id,
              email: session.user.email,
              role: 'user' as const
            };
            console.log('Setting fallback user on auth change:', fallbackUser);
            setInternalUser(fallbackUser);
          }
        } catch (roleTimeoutError) {
          console.error('Role query timeout in auth change, using fallback:', roleTimeoutError);
          const fallbackUser = {
            id: session.user.id,
            email: session.user.email,
            role: 'user' as const
          };
          console.log('Setting timeout fallback user on auth change:', fallbackUser);
          setInternalUser(fallbackUser);
        }
      } else {
        setInternalUser(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data: { user: authUser }, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (authUser) {
        // קבלת הרול מהדאטאבייס עם timeout
        try {
          const rolePromise = supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', authUser.id)
            .single();
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Role query timeout')), 5000)
          );
          
          const { data: userData, error: userError } = await Promise.race([
            rolePromise,
            timeoutPromise
          ]) as any;
        
          console.log('User role data:', { userData, userError });

          if (userError) {
            console.error('User role error, using fallback:', userError);
            // אם יש שגיאה ברול, נשתמש ברול ברירת מחדל
            const fallbackUser = {
              id: authUser.id,
              email: authUser.email,
              role: 'user' as const
            };
            setInternalUser(fallbackUser);
            return fallbackUser;
          }

          const newUser = {
            id: authUser.id,
            email: authUser.email,
            role: userData?.role || 'user'
          };

          console.log('Setting user after sign in:', newUser);
          setInternalUser(newUser);
          return newUser;
        } catch (roleTimeoutError) {
          console.error('Role query timeout in signIn, using fallback:', roleTimeoutError);
          const fallbackUser = {
            id: authUser.id,
            email: authUser.email,
            role: 'user' as const
          };
          setInternalUser(fallbackUser);
          return fallbackUser;
        }
      }
    } catch (error) {
      console.error('Error in signIn:', error);
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setInternalUser(null);
    window.location.reload();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};