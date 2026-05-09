'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [signupName, setSignupName] = useState('')
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [waitlistSuccess, setWaitlistSuccess] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  // Redirect already-logged-in users away from the login page
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        const redirectTo = searchParams.get('redirectTo') || '/dashboard'
        router.replace(redirectTo)
      } else {
        setCheckingAuth(false)
      }
    })
  }, [router, searchParams])

  const handleGitHubLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/` }
    })
    if (error) setMessage({ type: 'error', text: error.message })
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (mode === 'signup') {
      if (!signupName.trim()) {
        setMessage({ type: 'error', text: 'Please enter your name.' })
        setLoading(false)
        return
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: signupName.trim() }
        }
      })
      if (error) {
        // Supabase returns this when email is already registered
        if (
          error.message.toLowerCase().includes('already registered') ||
          error.message.toLowerCase().includes('user already exists') ||
          error.status === 400
        ) {
          setMessage({
            type: 'error',
            text: 'An account with this email already exists. Please sign in instead.',
          })
          setMode('signin')
        } else {
          setMessage({ type: 'error', text: error.message })
        }
      } else {
        setMessage({
          type: 'success',
          text: '✓ Account created! Please check your email to confirm, then sign in below.',
        })
        setMode('signin')
        // Clear signup fields
        setSignupName('')
        setPassword('')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        const redirectTo = searchParams.get('redirectTo') || '/dashboard'
        router.push(redirectTo)
      }
    }
    setLoading(false)
  }

  const handleWaitlistJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('waitlist').insert([{ name, email, feedback }])
    setLoading(false)
    if (error) {
      if (error.code === '23505') {
        setWaitlistSuccess(true)
      } else {
        setMessage({ type: 'error', text: `Waitlist error: ${error.message}` })
      }
    } else {
      setWaitlistSuccess(true)
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col md:flex-row">
      {/* Left Panel */}
      <div className="flex-1 bg-[var(--color-background)] p-12 flex flex-col justify-center relative overflow-hidden">
        {/* Animated yellow blob on login page too */}
        <div
          className="blob-yellow"
          style={{ width: '500px', height: '500px', top: '60%', left: '30%', opacity: 0.1 }}
        />
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(var(--color-text-sub) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative z-10 max-w-2xl">
          {/* Back to home */}
          <Link href="/" className="inline-flex items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors font-mono text-[10px] uppercase tracking-widest mb-8">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-accent-bg)] border border-[var(--color-accent-sub)] mb-6">
            <div className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse" />
            <span className="font-mono text-[10px] text-[var(--color-accent)] tracking-widest uppercase">Sentinel v1.0 — Beta</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-display font-extrabold text-white leading-[0.9] tracking-tight mb-8">
            Blast radius <br />analysis for <br />
            <span className="text-[var(--color-accent)]">AI-generated</span> code.
          </h1>

          <p className="text-lg text-[var(--color-text-sub)] max-w-lg mb-10 leading-relaxed">
            Sentinel is the safety layer between your AI coding agent and production.
            Before you merge, see every file affected by your changes — automatically.
          </p>

          <div className="flex flex-wrap gap-4">
            <div className="badge badge-yellow"><span className="text-[10px]">TYPESCRIPT & NEXT.JS</span></div>
            <div className="badge badge-blue"><span className="text-[10px]">PYTHON AST PARSING</span></div>
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

      {/* Right Panel */}
      <div className="w-full md:w-[460px] bg-[var(--color-background-2)] border-l border-[var(--color-border-main)] flex flex-col justify-center p-8 md:p-12">
        <div className="w-full">
          {/* Mode toggle */}
          <div className="flex rounded-lg border border-[var(--color-border-main)] overflow-hidden mb-8">
            <button
              onClick={() => { setMode('signin'); setMessage(null) }}
              className={`flex-1 py-2.5 text-xs font-mono uppercase tracking-wider transition-colors ${mode === 'signin' ? 'bg-[var(--color-accent)] text-black font-bold' : 'text-[var(--color-text-muted)] hover:text-white'}`}
            >Sign In</button>
            <button
              onClick={() => { setMode('signup'); setMessage(null) }}
              className={`flex-1 py-2.5 text-xs font-mono uppercase tracking-wider transition-colors ${mode === 'signup' ? 'bg-[var(--color-accent)] text-black font-bold' : 'text-[var(--color-text-muted)] hover:text-white'}`}
            >Sign Up</button>
          </div>

          {/* GitHub OAuth */}
          <button
            type="button"
            onClick={handleGitHubLogin}
            className="w-full bg-[#f0f0f2] hover:bg-white text-black font-mono font-bold text-xs uppercase tracking-wider py-4 rounded-lg flex items-center justify-center gap-3 transition-all transform hover:-translate-y-1 shadow-lg shadow-[rgba(0,0,0,0.4)] mb-2"
          >
            <svg height="20" viewBox="0 0 16 16" width="20" className="fill-current">
              <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
            </svg>
            {mode === 'signup' ? 'Sign Up with GitHub' : 'Sign In with GitHub'}
          </button>
          <p className="text-[9px] font-mono text-[var(--color-text-muted)] text-center mb-6">
            Note: GitHub OAuth must be configured in your Supabase project dashboard.
          </p>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[var(--color-border-sub)]" /></div>
            <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-widest">
              <span className="bg-[var(--color-background-2)] px-4 text-[var(--color-text-muted)]">or use email</span>
            </div>
          </div>

          {/* Email / Password form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block font-mono text-[10px] text-[var(--color-text-muted)] uppercase mb-2">Full Name</label>
                <input
                  type="text" required={mode === 'signup'} value={signupName}
                  onChange={e => setSignupName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full bg-[var(--color-background-3)] border border-[var(--color-border-main)] rounded-lg px-4 py-3 text-sm text-white placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
                />
              </div>
            )}
            <div>
              <label className="block font-mono text-[10px] text-[var(--color-text-muted)] uppercase mb-2">Email Address</label>
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full bg-[var(--color-background-3)] border border-[var(--color-border-main)] rounded-lg px-4 py-3 text-sm text-white placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] text-[var(--color-text-muted)] uppercase mb-2">Password</label>
              <input
                type="password" required value={password} minLength={6}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[var(--color-background-3)] border border-[var(--color-border-main)] rounded-lg px-4 py-3 text-sm text-white placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
              />
            </div>

            {message && (
              <div className={`p-3 rounded-lg text-xs font-mono ${message.type === 'error' ? 'bg-[rgba(255,71,87,0.1)] border border-[var(--color-red)] text-[var(--color-red)]' : 'bg-[rgba(46,213,115,0.1)] border border-[var(--color-green)] text-[var(--color-green)]'}`}>
                {message.text}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full bg-[var(--color-accent)] hover:bg-white text-black font-mono font-bold text-xs uppercase tracking-wider py-4 rounded-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-60"
            >
              {loading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          {/* Waitlist section */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[var(--color-border-sub)]" /></div>
            <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-widest">
              <span className="bg-[var(--color-background-2)] px-4 text-[var(--color-text-muted)]">or join waitlist</span>
            </div>
          </div>

          {waitlistSuccess ? (
            <div className="p-4 rounded-lg bg-[rgba(46,213,115,0.1)] border border-[var(--color-green)] text-[var(--color-green)] text-sm font-mono text-center">
              ✓ You&apos;re on the waitlist!
            </div>
          ) : (
            <form onSubmit={handleWaitlistJoin} className="space-y-3">
              <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
                className="w-full bg-[var(--color-background-3)] border border-[var(--color-border-main)] rounded-lg px-4 py-3 text-sm text-white placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors" />
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com"
                className="w-full bg-[var(--color-background-3)] border border-[var(--color-border-main)] rounded-lg px-4 py-3 text-sm text-white placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors" />
              <textarea value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="What are you building? (optional)"
                className="w-full bg-[var(--color-background-3)] border border-[var(--color-border-main)] rounded-lg px-4 py-3 text-sm text-white placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors resize-none h-20" />
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-lg font-mono text-[10px] uppercase tracking-widest font-bold border border-[var(--color-border-main)] text-[var(--color-text-main)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-all disabled:opacity-60">
                {loading ? 'Joining...' : 'Join the Waitlist'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
