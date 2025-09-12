import React from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const SpikyEffect = () => (
  <div className="absolute inset-0 flex items-center justify-center opacity-70">
    <div className="relative w-full h-full max-w-lg max-h-lg">
      {Array.from({ length: 150 }).map((_, i) => {
        const angle = (i / 150) * 360;
        const rotation = Math.random() * 360;
        const distance = 200 + Math.random() * 50;
        const width = 1 + Math.random() * 2;
        const height = 50 + Math.random() * 100;
        const top = `calc(50% + ${Math.sin(angle * (Math.PI / 180)) * distance}px)`;
        const left = `calc(50% + ${Math.cos(angle * (Math.PI / 180)) * distance}px)`;
        const delay = Math.random() * -2;

        return (
          <div
            key={i}
            className="absolute bg-gradient-to-b from-pink-500 to-purple-600 spiky-effect-line"
              style={{
                '--top': top,
                '--left': left,
                '--width': `${width}px`,
                '--height': `${height}px`,
                '--rotation': `${rotation}deg`,
                '--delay': `${delay}s`,
              } as React.CSSProperties}
          />
        );
      })}
    </div>
  </div>
);

interface LoginPageProps {
  onLoginSuccess: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { setUser, signIn } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = React.useState('signin');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleSignUp = async () => {
    try {
      setLoading(true);
      setError('');

      // 1. הרשמה ב-Supabase Auth
      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;

      if (user) {
        // עדכון הקונטקסט (הרשומה ב-public.users נוצרת ע"י טריגר במסד)
        setUser({
          id: user.id,
          email: user.email,
          role: 'user'
        });

        alert('נרשמת בהצלחה! נשלח אליך מייל אימות. אנא אשר אותו לפני ההתחברות.');
        setActiveTab('signin');
        setPassword('');
      }
    } catch (err: any) {
      console.error('Error signing up:', err);
      // טיפול בשגיאת rate limiting
      if (err?.message?.includes('security purposes') && err?.message?.includes('seconds')) {
        const seconds = err.message.match(/\d+/)?.[0] || '60';
        setError(`נא להמתין ${seconds} שניות לפני ניסיון הרשמה נוסף`);
      } else {
        setError(err?.message || 'שגיאה בהרשמה');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('Attempting to sign in with:', { email });
      const user = await signIn(email, password);
      
      if (user) {
        console.log('Login successful, calling onLoginSuccess...');
        onLoginSuccess();
      }
    } catch (err: any) {
      console.error('Error signing in:', err);
      setError(err?.message || 'שגיאה בהתחברות');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    try {
      setLoading(true);
      setError('');

      if (!email) {
        setError('נא להזין כתובת אימייל');
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });

      if (error) throw error;

      alert('נשלח לך מייל לאיפוס סיסמה');
    } catch (err: any) {
      console.error('Error resetting password:', err);
      setError(err?.message || 'שגיאה בשליחת מייל לאיפוס סיסמה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black dark:bg-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Theme toggle button */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 left-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors z-20"
        title={theme === 'light' ? 'מעבר למצב כהה' : 'מעבר למצב בהיר'}
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>

      {/* Subtle background glow */}
      <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-purple-900/50 rounded-full blur-3xl filter opacity-30"></div>
      <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-pink-900/50 rounded-full blur-3xl filter opacity-30"></div>
      
      {/* Tiny stars */}
      <div className="absolute top-1/4 left-1/4 w-0.5 h-0.5 bg-white rounded-full opacity-50"></div>
      <div className="absolute bottom-1/3 right-1/4 w-0.5 h-0.5 bg-white rounded-full opacity-30"></div>

      <SpikyEffect />

      {/* Main card */}
      <div className="relative z-10 w-full max-w-sm">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/10">
          {/* User avatar */}
          <div className="flex justify-center mb-6">
            <div 
              className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center border border-white/20 backdrop-blur-sm"
              role="img"
              aria-label="User icon"
            >
              <span className="text-4xl">👤</span>
            </div>
          </div>

          {/* Welcome text */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-1">ברוכים הבאים</h1>
            <p className="text-white/60 text-sm">התחבר למערכת</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          {/* Form */}
          <div className="space-y-6">
            {activeTab === 'signup' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/60 text-xs font-medium mb-2">
                      שם פרטי
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-4 py-3 bg-[#FFFDE7] rounded-xl text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-400 border border-transparent"
                      placeholder="שם פרטי"
                      disabled={loading}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-white/60 text-xs font-medium mb-2">
                      שם משפחה
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-4 py-3 bg-[#FFFDE7] rounded-xl text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-400 border border-transparent"
                      placeholder="שם משפחה"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {/* Email field */}
            <div>
              <label className="block text-white/60 text-xs font-medium mb-2">
                כתובת אימייל
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-[#FFFDE7] rounded-xl text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-400 border border-transparent"
                placeholder="your@email.com"
                disabled={loading}
                required
              />
            </div>

            {/* Password field */}
            <div>
              <label className="block text-white/60 text-xs font-medium mb-2">
                סיסמה
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#FFFDE7] rounded-xl text-black focus:outline-none focus:ring-2 focus:ring-pink-400 border border-transparent tracking-widest"
                disabled={loading}
                placeholder="הזן סיסמה"
                title="סיסמה"
                required
              />
            </div>

            {/* Action Button (Sign In/Sign Up) */}
            <button
              onClick={activeTab === 'signin' ? handleSignIn : handleSignUp}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-pink-500 via-orange-400 to-cyan-400 rounded-xl text-white font-semibold flex items-center justify-center space-x-2 hover:shadow-lg hover:shadow-pink-500/30 transition-all duration-300 disabled:opacity-50"
            >
              <span className="text-xl">🔒</span>
              <span>{loading ? 'מתחבר...' : activeTab === 'signin' ? 'התחבר' : 'הירשם'}</span>
            </button>

            {/* Forgot password and Sign up - only show in signin mode */}
            {activeTab === 'signin' && (
              <div className="text-center space-y-2">
                <button
                  onClick={handleForgotPassword}
                  disabled={loading}
                  className="text-white/50 text-sm hover:text-white transition-colors disabled:opacity-50"
                >
                  שכחת סיסמה?
                </button>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <span className="text-white/50 text-sm">אין לך חשבון?</span>
                  <button
                    onClick={() => {
                      setActiveTab('signup');
                      setError('');
                      setPassword('');
                    }}
                    disabled={loading}
                    className="text-blue-400 text-sm hover:text-blue-300 transition-colors disabled:opacity-50 font-medium"
                  >
                    הירשם עכשיו
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        .spiky-effect-line {
          top: var(--top);
          left: var(--left);
          width: var(--width);
          height: var(--height);
          transform: translate(-50%, -50%) rotate(var(--rotation));
          animation: flicker 2s infinite var(--delay) alternate;
        }
        @keyframes flicker {
          0% { opacity: 0.5; transform: translate(-50%, -50%) scale(1) rotate(var(--rotation)); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.05) rotate(var(--rotation)); }
          100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1) rotate(var(--rotation)); }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
