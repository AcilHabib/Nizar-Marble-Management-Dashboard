import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, setUnauthorizedHandler } from '@/lib/api';

type AuthState = {
  username: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUsername(null);
      qc.clear();
    });
    let cancelled = false;
    api
      .currentUser()
      .then((user) => {
        if (!cancelled) setUsername(user.username);
      })
      .catch(() => {
        if (!cancelled) setUsername(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [qc]);

  const login = async (name: string, password: string) => {
    const user = await api.login({ username: name, password });
    setUsername(user.username);
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      setUsername(null);
      qc.clear();
    }
  };

  return (
    <AuthContext.Provider value={{ username, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}

const labels = {
  ar: {
    title: 'تسجيل الدخول',
    hint: 'أدخل حساب المسؤول للوصول إلى البرنامج.',
    username: 'اسم المستخدم',
    password: 'كلمة المرور',
    submit: 'دخول',
    invalid: 'اسم المستخدم أو كلمة المرور غير صحيحة.',
    brand: 'نزار للرخام',
  },
  fr: {
    title: 'Connexion',
    hint: 'Entrez le compte administrateur pour ouvrir le programme.',
    username: "Nom d'utilisateur",
    password: 'Mot de passe',
    submit: 'Entrer',
    invalid: "Nom d'utilisateur ou mot de passe incorrect.",
    brand: 'Nizar Marble',
  },
};

export function LoginScreen({
  lang,
  setLang,
}: {
  lang: 'ar' | 'fr';
  setLang: (lang: 'ar' | 'fr') => void;
}) {
  const { login } = useAuth();
  const t = labels[lang];
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      await login(username, password);
    } catch {
      setError(t.invalid);
    } finally {
      setPending(false);
    }
  };

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="flex min-h-dvh items-center justify-center bg-[#F8F8F6] px-4">
      <form onSubmit={submit} className="w-full max-w-[420px] rounded-[16px] border border-[#E7E5E0] bg-white p-6 shadow-sm md:p-8">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold tracking-[.16em] text-[#9B8C77]">{t.brand}</p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#17212B]">{t.title}</h1>
            <p className="mt-2 text-xs leading-relaxed text-[#5F6B76]">{t.hint}</p>
          </div>
          <button
            type="button"
            data-testid="button-login-language"
            onClick={() => setLang(lang === 'ar' ? 'fr' : 'ar')}
            className="rounded-md border border-[#E7E5E0] bg-white px-3 py-1.5 text-[11px] font-bold"
          >
            {lang === 'ar' ? 'FR' : 'AR'}
          </button>
        </div>
        <label className="block text-xs font-semibold">
          {t.username}
          <input
            data-testid="input-login-username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
            className="mt-1.5 h-11 w-full rounded-lg border border-[#E7E5E0] px-3 text-sm font-normal outline-none focus:border-[#CFC3AE]"
          />
        </label>
        <label className="mt-4 block text-xs font-semibold">
          {t.password}
          <input
            data-testid="input-login-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            className="mt-1.5 h-11 w-full rounded-lg border border-[#E7E5E0] px-3 text-sm font-normal outline-none focus:border-[#CFC3AE]"
          />
        </label>
        {error && (
          <p data-testid="text-login-error" className="mt-4 text-xs font-semibold text-[#D95C55]">
            {error}
          </p>
        )}
        <button
          data-testid="button-login-submit"
          type="submit"
          disabled={pending}
          className="mt-6 h-11 w-full rounded-lg bg-[#3A3D3F] text-sm font-bold text-white disabled:opacity-60"
        >
          {t.submit}
        </button>
      </form>
    </div>
  );
}
