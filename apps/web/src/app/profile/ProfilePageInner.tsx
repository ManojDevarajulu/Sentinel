'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

type Tab = 'profile' | 'settings'

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="card flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest">{label}</p>
        <span className="text-[var(--color-text-muted)]">{icon}</span>
      </div>
      <p className="text-2xl font-display font-bold text-[var(--color-text-main)]">{value}</p>
    </div>
  )
}

function Toggle({ enabled, onChange, label }: { enabled: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-[var(--color-text-sub)]">{label}</span>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${enabled ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-background-3)]'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${enabled ? 'translate-x-4' : 'translate-x-0'}`}
        />
      </button>
    </div>
  )
}

function InfoRow({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <span className="font-mono text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider flex-shrink-0">{label}</span>
      <span className={`text-xs text-right ${mono ? 'font-mono' : ''} ${highlight ? 'text-[var(--color-green)]' : 'text-[var(--color-text-sub)]'}`}>{value}</span>
    </div>
  )
}

function LimitRow({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = Math.min((used / max) * 100, 100)
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="font-mono text-[10px] text-[var(--color-text-muted)] uppercase">{label}</span>
        <span className="font-mono text-[10px] text-[var(--color-text-sub)]">{used} / {max}</span>
      </div>
      <div className="h-1 bg-[var(--color-background-3)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: pct > 80 ? 'var(--color-red)' : pct > 50 ? 'var(--color-amber)' : 'var(--color-accent)' }}
        />
      </div>
    </div>
  )
}

export default function ProfilePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get('tab') as Tab) || 'profile'
  const [tab, setTab] = useState<Tab>(initialTab)

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [repoCount, setRepoCount] = useState(0)

  // Profile edit state
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Password change
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [pwLoading, setPwLoading] = useState(false)

  // Settings toggles
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [weeklyDigest, setWeeklyDigest] = useState(false)
  const [prAlerts, setPrAlerts] = useState(true)

  const loadProfileData = useCallback(async () => {
    // Use getSession() first — it reads from localStorage instantly (no network round-trip).
    // getUser() makes a network call and returns null during hydration, causing a false redirect.
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session) {
      return null
    }
    const currentUser = sessionData.session.user
    const { count } = await supabase
      .from('repos')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', currentUser.id)
    return {
      user: currentUser,
      repoCount: count || 0,
    }
  }, [])

  useEffect(() => {
    let active = true

    loadProfileData().then((profile) => {
      if (!active) return

      if (!profile) {
        router.push('/login')
        return
      }

      setUser(profile.user)
      setDisplayName(profile.user.user_metadata?.full_name || '')
      setRepoCount(profile.repoCount)
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [loadProfileData, router])

  // Also listen for auth state changes (e.g. token refresh, sign-out in another tab)
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/login')
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [router])

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName.trim()) return
    setSaving(true)
    setSaveMsg(null)
    const { error } = await supabase.auth.updateUser({ data: { full_name: displayName.trim() } })
    setSaving(false)
    if (error) {
      setSaveMsg({ type: 'error', text: error.message })
    } else {
      setSaveMsg({ type: 'success', text: '✓ Display name updated.' })
      const profile = await loadProfileData()
      if (profile) {
        setUser(profile.user)
        setDisplayName(profile.user.user_metadata?.full_name || '')
        setRepoCount(profile.repoCount)
      }
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: 'error', text: 'Passwords do not match.' })
      return
    }
    if (newPassword.length < 6) {
      setPwMsg({ type: 'error', text: 'Password must be at least 6 characters.' })
      return
    }
    setPwLoading(true)
    setPwMsg(null)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPwLoading(false)
    if (error) {
      setPwMsg({ type: 'error', text: error.message })
    } else {
      setPwMsg({ type: 'success', text: '✓ Password updated successfully.' })
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
          <p className="font-mono text-xs text-[var(--color-text-muted)]">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const initials = user.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email?.slice(0, 2).toUpperCase() ?? '??'

  const authProvider = user.app_metadata?.provider || 'email'
  const memberSince = new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const lastSignIn = user.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'N/A'

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[var(--color-background)]">
      {/* Page header */}
      <div className="border-b border-[var(--color-border-main)] bg-[var(--color-background-2)]">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-6">
            <Link href="/" className="font-mono text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors uppercase tracking-widest">Home</Link>
            <span className="text-[var(--color-text-muted)] font-mono text-[10px]">/</span>
            <span className="font-mono text-[10px] text-[var(--color-text-sub)] uppercase tracking-widest">Profile</span>
          </div>

          {/* Profile header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[#c8e020] flex items-center justify-center text-black font-display font-extrabold text-2xl shadow-lg shadow-[rgba(232,255,71,0.15)]">
                {initials}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[var(--color-green)] rounded-full border-2 border-[var(--color-background-2)]" title="Active" />
            </div>

            <div className="flex-1">
              <h1 className="text-2xl font-display font-bold text-[var(--color-text-main)] mb-1">
                {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
              </h1>
              <p className="text-sm text-[var(--color-text-sub)] font-mono mb-3">{user.email}</p>
              <div className="flex flex-wrap gap-2">
                <span className="badge badge-yellow">FREE PLAN</span>
                <span className="badge bg-[var(--color-background-3)] text-[var(--color-text-muted)] border border-[var(--color-border-main)] capitalize">
                  {authProvider === 'email' ? '✉ Email Auth' : `⌥ ${authProvider}`}
                </span>
                <span className="badge bg-[var(--color-background-3)] text-[var(--color-green)] border border-[rgba(46,213,115,0.2)]">● Active</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Link href="/dashboard" className="btn-primary text-[10px] px-4 py-2">DASHBOARD</Link>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex gap-0">
            {(['profile', 'settings'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`font-mono text-[11px] uppercase tracking-widest px-5 py-3 border-b-2 transition-colors ${tab === t ? 'border-[var(--color-accent)] text-[var(--color-accent)]' : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-sub)]'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* ======= PROFILE TAB ======= */}
        {tab === 'profile' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Repositories" value={repoCount} icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
              } />
              <StatCard label="Plan" value="Free" icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
              } />
              <StatCard label="Auth Method" value={authProvider === 'email' ? 'Email' : authProvider} icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
              } />
              <StatCard label="Status" value="Active" icon={
                <svg className="w-4 h-4 text-[var(--color-green)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              } />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="card space-y-4">
                <h2 className="font-display font-bold text-base border-b border-[var(--color-border-main)] pb-3">Account Information</h2>
                <InfoRow label="User ID" value={user.id.slice(0, 8) + '...'} mono />
                <InfoRow label="Email" value={user.email || ''} mono />
                <InfoRow label="Display Name" value={user.user_metadata?.full_name || '—'} />
                <InfoRow label="Auth Provider" value={authProvider} />
                <InfoRow label="Member Since" value={memberSince} />
                <InfoRow label="Last Sign In" value={lastSignIn} mono />
                <InfoRow label="Email Verified" value={user.email_confirmed_at ? '✓ Verified' : '✗ Not verified'} highlight={!!user.email_confirmed_at} />
              </div>

              <div className="card space-y-4">
                <h2 className="font-display font-bold text-base border-b border-[var(--color-border-main)] pb-3">Plan & Limits</h2>
                <div className="p-4 rounded-lg border border-[var(--color-accent-sub)] bg-[var(--color-accent-bg)]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-sm text-[var(--color-accent)]">FREE PLAN</span>
                    <span className="badge badge-yellow">CURRENT</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-sub)] leading-relaxed">Full access to local scanning, blast radius analysis, and the dashboard.</p>
                </div>
                <div className="space-y-3">
                  <LimitRow label="Repositories" used={repoCount} max={10} />
                  <LimitRow label="Scan Jobs" used={0} max={50} />
                  <LimitRow label="Graph Nodes" used={0} max={500} />
                </div>
                <button className="w-full py-2 rounded-lg font-mono text-[10px] uppercase tracking-widest font-bold border border-[var(--color-border-sub)] text-[var(--color-text-muted)] cursor-not-allowed opacity-60">
                  Upgrade Plan — Coming Soon
                </button>
              </div>
            </div>

            <div className="card">
              <h2 className="font-display font-bold text-base border-b border-[var(--color-border-main)] pb-3 mb-4">Recent Activity</h2>
              {repoCount === 0 ? (
                <div className="text-center py-8 text-[var(--color-text-muted)]">
                  <svg className="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  <p className="font-mono text-sm">No activity yet.</p>
                  <p className="font-mono text-xs mt-1"><Link href="/dashboard" className="text-[var(--color-accent)] underline">Scan a repository</Link> to get started.</p>
                </div>
              ) : (
                <p className="font-mono text-xs text-[var(--color-text-muted)]">{repoCount} repositor{repoCount === 1 ? 'y' : 'ies'} connected. <Link href="/dashboard" className="text-[var(--color-accent)] underline">View in dashboard →</Link></p>
              )}
            </div>
          </div>
        )}

        {/* ======= SETTINGS TAB ======= */}
        {tab === 'settings' && (
          <div className="space-y-6 max-w-2xl">
            <div className="card">
              <h2 className="font-display font-bold text-base mb-4">Display Name</h2>
              <form onSubmit={handleSaveName} className="space-y-4">
                <div>
                  <label className="block font-mono text-[10px] text-[var(--color-text-muted)] uppercase mb-2">Full Name</label>
                  <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Enter your display name"
                    className="w-full bg-[var(--color-background-3)] border border-[var(--color-border-main)] rounded-lg px-4 py-3 text-sm text-white placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors" />
                </div>
                {saveMsg && (
                  <div className={`p-3 rounded-lg text-xs font-mono ${saveMsg.type === 'error' ? 'bg-[rgba(255,71,87,0.1)] border border-[var(--color-red)] text-[var(--color-red)]' : 'bg-[rgba(46,213,115,0.1)] border border-[var(--color-green)] text-[var(--color-green)]'}`}>
                    {saveMsg.text}
                  </div>
                )}
                <button type="submit" disabled={saving} className="btn-primary text-[10px] px-6 py-2.5 disabled:opacity-60">
                  {saving ? 'Saving...' : 'Save Name'}
                </button>
              </form>
            </div>

            {authProvider === 'email' && (
              <div className="card">
                <h2 className="font-display font-bold text-base mb-1">Change Password</h2>
                <p className="text-xs text-[var(--color-text-muted)] font-mono mb-4">Must be at least 6 characters.</p>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block font-mono text-[10px] text-[var(--color-text-muted)] uppercase mb-2">New Password</label>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" minLength={6}
                      className="w-full bg-[var(--color-background-3)] border border-[var(--color-border-main)] rounded-lg px-4 py-3 text-sm text-white placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors" />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] text-[var(--color-text-muted)] uppercase mb-2">Confirm New Password</label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••"
                      className="w-full bg-[var(--color-background-3)] border border-[var(--color-border-main)] rounded-lg px-4 py-3 text-sm text-white placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors" />
                  </div>
                  {pwMsg && (
                    <div className={`p-3 rounded-lg text-xs font-mono ${pwMsg.type === 'error' ? 'bg-[rgba(255,71,87,0.1)] border border-[var(--color-red)] text-[var(--color-red)]' : 'bg-[rgba(46,213,115,0.1)] border border-[var(--color-green)] text-[var(--color-green)]'}`}>
                      {pwMsg.text}
                    </div>
                  )}
                  <button type="submit" disabled={pwLoading || !newPassword || !confirmPassword} className="btn-primary text-[10px] px-6 py-2.5 disabled:opacity-60">
                    {pwLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>
            )}

            <div className="card">
              <h2 className="font-display font-bold text-base mb-1">Notifications</h2>
              <p className="text-xs text-[var(--color-text-muted)] font-mono mb-4">Manage how Sentinel contacts you. (UI preview — backend coming soon)</p>
              <div className="divide-y divide-[var(--color-border-main)]">
                <Toggle enabled={emailNotifs} onChange={setEmailNotifs} label="Email notifications for scan completions" />
                <Toggle enabled={prAlerts} onChange={setPrAlerts} label="PR blast radius alerts" />
                <Toggle enabled={weeklyDigest} onChange={setWeeklyDigest} label="Weekly repository digest" />
              </div>
            </div>

            <div className="card">
              <h2 className="font-display font-bold text-base mb-4">Session</h2>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[var(--color-border-sub)] text-[var(--color-text-sub)] hover:border-[var(--color-amber)] hover:text-[var(--color-amber)] transition-colors font-mono text-xs uppercase tracking-widest"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Sign Out
              </button>
            </div>

            <div className="card border border-[rgba(255,71,87,0.25)]">
              <h2 className="font-display font-bold text-base text-[var(--color-red)] mb-1">Danger Zone</h2>
              <p className="text-xs text-[var(--color-text-muted)] font-mono mb-4">These actions are irreversible. Please be certain.</p>
              <button disabled className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[rgba(255,71,87,0.3)] text-[var(--color-red)] opacity-50 cursor-not-allowed font-mono text-xs uppercase tracking-widest">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Delete Account — Coming Soon
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
