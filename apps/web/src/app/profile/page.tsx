import { Suspense } from 'react'
import ProfilePageInner from './ProfilePageInner'

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
          <p className="font-mono text-xs text-[var(--color-text-muted)]">Loading profile...</p>
        </div>
      </div>
    }>
      <ProfilePageInner />
    </Suspense>
  )
}
