"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleGitHubLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    });
    if (error) console.error("Login failed:", error);
  };

  const handleWaitlistJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('waitlist').insert([{ email }]);
    setLoading(false);
    if (error) {
      alert("Something went wrong. Please try again.");
    } else {
      setSuccess(true);
      setEmail("");
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col md:flex-row">
      {/* Left Panel: Hero Section */}
      <div className="flex-1 bg-[var(--color-background)] p-12 flex flex-col justify-center relative overflow-hidden">
        {/* Background Decorative Grid */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(var(--color-text-sub) 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
        
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-accent-bg)] border border-[var(--color-accent-sub)] mb-6">
            <div className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse"></div>
            <span className="font-mono text-[10px] text-[var(--color-accent)] tracking-widest uppercase">Sentinel v1.0 — Beta</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-display font-extrabold text-white leading-[0.9] tracking-tight mb-8">
            Blast radius <br />
            analysis for <br />
            <span className="text-[var(--color-accent)]">AI-generated</span> code.
          </h1>

          <p className="text-lg text-[var(--color-text-sub)] font-sans max-w-lg mb-10 leading-relaxed">
            Sentinel is the safety layer between your AI coding agent and production. 
            Before you merge, see every file affected by your changes — automatically.
          </p>

          <div className="flex flex-wrap gap-4">
            <div className="badge badge-yellow">
              <span className="text-[10px]">TYPESCRIPT & NEXT.JS</span>
            </div>
            <div className="badge badge-blue">
              <span className="text-[10px]">PYTHON AST PARSING</span>
            </div>
          </div>

          <div className="mt-16 pt-16 border-t border-[var(--color-border-main)] grid grid-cols-3 gap-8">
            <div>
              <div className="font-display text-2xl font-bold text-white">800ms</div>
              <div className="font-mono text-[10px] text-[var(--color-text-muted)] uppercase mt-1">Average Scan</div>
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-white">4 Hops</div>
              <div className="font-mono text-[10px] text-[var(--color-text-muted)] uppercase mt-1">Depth Analysis</div>
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-white">100%</div>
              <div className="font-mono text-[10px] text-[var(--color-text-muted)] uppercase mt-1">Local AST</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Auth & Interest */}
      <div className="w-full md:w-[450px] bg-[var(--color-background-2)] border-l border-[var(--color-border-main)] flex flex-col justify-center p-8 md:p-12">
        <div className="w-full">
          <div className="mb-12">
            <h2 className="text-xl font-display font-bold text-white mb-2">Get Started</h2>
            <p className="text-sm text-[var(--color-text-sub)]">Analyze your first repository in seconds.</p>
          </div>

          <button 
            onClick={handleGitHubLogin}
            className="w-full bg-[#f0f0f2] hover:bg-white text-black font-mono font-bold text-xs uppercase tracking-wider py-4 rounded-lg flex items-center justify-center gap-3 transition-all transform hover:-translate-y-1 shadow-lg shadow-[rgba(0,0,0,0.4)]"
          >
            <svg height="20" viewBox="0 0 16 16" width="20" className="fill-current">
              <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
            </svg>
            Sign in with GitHub
          </button>

          <div className="relative my-10">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[var(--color-border-sub)]"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-widest"><span className="bg-[var(--color-background-2)] px-4 text-[var(--color-text-muted)]">or show interest</span></div>
          </div>

          <form onSubmit={handleWaitlistJoin} className="space-y-4">
            <div>
              <label className="block font-mono text-[10px] text-[var(--color-text-muted)] uppercase mb-2">Email Address</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full bg-[var(--color-background-3)] border border-[var(--color-border-main)] rounded-lg px-4 py-3 text-sm text-white placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
              />
            </div>
            <button 
              type="submit" 
              disabled={loading || success}
              className={`w-full py-3 rounded-lg font-mono text-[10px] uppercase tracking-widest font-bold transition-all ${success ? 'bg-[var(--color-green)] text-black' : 'bg-transparent border border-[var(--color-border-main)] text-[var(--color-text-main)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'}`}
            >
              {loading ? 'Joining...' : success ? 'Added to waitlist!' : 'Join the waitlist'}
            </button>
          </form>

          <p className="mt-12 text-[10px] text-[var(--color-text-muted)] leading-relaxed font-sans text-center">
            By signing in or joining the waitlist, you agree to Sentinel's 
            <a href="#" className="text-[var(--color-text-sub)] hover:underline ml-1">Terms of Service</a> and 
            <a href="#" className="text-[var(--color-text-sub)] hover:underline ml-1">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
