'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProfile() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      setUser(session.user)
      setLoading(false)
    }
    loadProfile()
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-8 flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse flex items-center gap-2">
          <div className="w-2 h-2 bg-[var(--color-accent)] rounded-full"></div>
          <span className="font-mono text-xs text-[var(--color-text-sub)]">Loading Profile...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-8 pb-4 border-b border-[var(--color-border-main)]">
        <h1 className="text-2xl font-bold">Your Profile</h1>
        <p className="text-[var(--color-text-sub)] text-sm mt-1">Manage your account and authentication settings.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="p-6 border border-dashed border-[var(--color-border-sub)] rounded-xl bg-[var(--color-background-2)]">
          <p className="font-mono text-[10px] text-[var(--color-accent)] tracking-widest mb-4 uppercase">Account Details</p>
          
          <div className="space-y-4 mb-8">
            <div>
              <p className="font-mono text-[10px] text-[var(--color-text-muted)] uppercase mb-1">Email</p>
              <p className="font-mono text-sm">{user?.email}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] text-[var(--color-text-muted)] uppercase mb-1">User ID</p>
              <p className="font-mono text-xs text-[var(--color-text-sub)] truncate">{user?.id}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] text-[var(--color-text-muted)] uppercase mb-1">Last Sign In</p>
              <p className="font-mono text-xs text-[var(--color-text-sub)]">
                {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Unknown'}
              </p>
            </div>
          </div>

          <button 
            onClick={handleSignOut}
            className="w-full py-2 border border-[var(--color-border-main)] rounded text-xs font-mono text-[var(--color-text-main)] hover:border-[var(--color-red)] hover:text-[var(--color-red)] transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
