"use client";

import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  const handleGitHubLogin = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    });
    if (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[var(--color-background-2)] border border-[var(--color-border-main)] rounded-xl p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-green)]"></div>
        <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse"></div>
        
        <div className="text-center mb-8">
          <h1 className="font-mono text-2xl font-bold text-white tracking-tight mb-2">Sentinel</h1>
          <p className="text-[var(--color-text-sub)] text-sm">Blast radius analysis for AI-generated code.</p>
          <p className="text-[var(--color-text-muted)] text-xs mt-1">Supports TypeScript and Python repositories.</p>
        </div>

        <button 
          onClick={handleGitHubLogin}
          className="w-full bg-[#24292e] hover:bg-[#2f363d] text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-3 transition-colors border border-[#1b1f23] shadow-sm"
        >
          <svg height="20" aria-hidden="true" viewBox="0 0 16 16" version="1.1" width="20" data-view-component="true" className="fill-current text-white">
            <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
          </svg>
          Continue with GitHub
        </button>

        <div className="mt-8 text-center text-xs text-[var(--color-text-muted)] font-mono">
          <p>By continuing, you agree to Sentinel's <a href="#" className="text-[var(--color-text-sub)] hover:underline">Terms of Service</a> and <a href="#" className="text-[var(--color-text-sub)] hover:underline">Privacy Policy</a>.</p>
        </div>
      </div>
    </div>
  );
}
