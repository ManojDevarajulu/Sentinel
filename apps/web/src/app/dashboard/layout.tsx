import React from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-[calc(100vh-65px)]">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-[var(--color-border-main)] bg-[var(--color-background-2)] flex flex-col hidden md:flex">
        <div className="p-4 border-b border-[var(--color-border-main)]">
          <h2 className="font-mono text-xs text-[var(--color-text-sub)] tracking-widest mb-4 uppercase">Repositories</h2>
          <div className="flex flex-col gap-2">
            {/* Mock repository list */}
            <a href="/dashboard/repo-1" className="flex items-center justify-between p-2 rounded bg-[var(--color-background-3)] border border-[var(--color-border-sub)] hover:border-[var(--color-accent-sub)] transition-colors cursor-pointer group">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[var(--color-text-sub)] group-hover:text-[var(--color-text-main)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                <span className="text-sm font-medium text-[var(--color-text-main)]">acme-corp/frontend</span>
              </div>
            </a>
            <a href="/dashboard/repo-2" className="flex items-center justify-between p-2 rounded hover:bg-[var(--color-background-3)] transition-colors cursor-pointer group">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[var(--color-text-sub)] group-hover:text-[var(--color-text-main)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                <span className="text-sm font-medium text-[var(--color-text-sub)] group-hover:text-[var(--color-text-main)]">acme-corp/api</span>
              </div>
            </a>
          </div>
          
          <button className="w-full mt-4 py-2 border border-dashed border-[var(--color-border-main)] text-[var(--color-text-sub)] text-xs font-mono uppercase tracking-wider rounded hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors">
            + Connect Repo
          </button>
        </div>
        
        <div className="mt-auto p-4 border-t border-[var(--color-border-main)]">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-[var(--color-background-3)] flex items-center justify-center font-mono text-xs border border-[var(--color-border-sub)]">
               JD
             </div>
             <div>
               <p className="text-sm font-medium">John Doe</p>
               <p className="text-xs text-[var(--color-text-muted)]">Pro Plan</p>
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto bg-[var(--color-background)] relative">
        {children}
      </main>
    </div>
  )
}
