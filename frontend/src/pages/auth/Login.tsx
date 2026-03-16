import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { GraduationCap, Eye, EyeOff, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';

const demoUsers = [
  { role: 'Admin', email: 'admin@brevian.ac.ug', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { role: 'Teacher', email: 'sarah.namaganda@brevian.ac.ug', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { role: 'Counselor', email: 'counselor@brevian.ac.ug', color: 'bg-rose-100 text-rose-700 border-rose-200' },
  { role: 'Parent', email: 'james.mugisha@gmail.com', color: 'bg-green-100 text-green-700 border-green-200' },
  { role: 'Student', email: 'emma.namukasa@brevian.ac.ug', color: 'bg-amber-100 text-amber-700 border-amber-200' },
];

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@brevian.ac.ug');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      toast.error(axiosErr?.response?.data?.error || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-indigo-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">SWAM-MIS</h1>
          <p className="text-primary-200 mt-1 text-sm">Student Well-Being & Academic Monitoring</p>
          <p className="text-primary-300 text-xs mt-0.5">Brevian Academy</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">Sign in to your account</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input"
                placeholder="Enter your email"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
              <LogIn className="w-4 h-4" />
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Demo Accounts */}
        <div className="mt-5 bg-white/10 backdrop-blur rounded-xl p-4">
          <p className="text-primary-200 text-xs font-medium mb-3 text-center uppercase tracking-wider">Demo Accounts (password: password123)</p>
          <div className="grid grid-cols-1 gap-1.5">
            {demoUsers.map(u => (
              <button
                key={u.role}
                onClick={() => { setEmail(u.email); setPassword('password123'); }}
                className={`text-left px-3 py-2 rounded-lg border text-xs transition-all hover:shadow-sm ${u.color}`}
              >
                <span className="font-semibold">{u.role}:</span> {u.email}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
