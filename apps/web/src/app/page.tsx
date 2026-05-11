'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Home() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [joined, setJoined] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const handleWaitlist = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email.')
      return
    }
    setLoading(true)
    setError('')
    const { error: dbError } = await supabase
      .from('waitlist')
      .insert([{ email, metadata: { source: 'landing-page' } }])
    setLoading(false)
    if (dbError) {
      if (dbError.code === '23505') {
        setJoined(true)
      } else {
        setError('Something went wrong. Please try again.')
      }
    } else {
      setJoined(true)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setIsLoggedIn(true)
        router.replace('/dashboard')
      }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsLoggedIn(true)
        router.replace('/dashboard')
      } else {
        setIsLoggedIn(false)
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [router])

  return (
    <div className="flex flex-col min-h-screen">

      {/* HERO */}
      <section className="relative flex flex-col items-center justify-center min-h-[90vh] px-6 text-center overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage:'linear-gradient(var(--color-border-main) 1px, transparent 1px),linear-gradient(90deg,var(--color-border-main) 1px,transparent 1px)',backgroundSize:'40px 40px'}} />

        {/* === YELLOW BLOB SPHERE === */}
        <div
          className="blob-yellow"
          style={{
            width: '720px',
            height: '720px',
            top: '45%',
            left: '50%',
          }}
        />
        {/* Secondary smaller blob for depth */}
        <div
          className="blob-yellow"
          style={{
            width: '380px',
            height: '380px',
            top: '30%',
            left: '65%',
            animationDelay: '4s',
            animationDuration: '18s',
            opacity: 0.07,
          }}
        />

        {/* Sharp accent glow (existing) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full opacity-5 blur-[60px] pointer-events-none" style={{background:'radial-gradient(circle,var(--color-accent),transparent 70%)'}} />

        <div className="relative z-10 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 border rounded-md border-[var(--color-accent-sub)] bg-[var(--color-accent-bg)]">
            <div className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse" />
            <span className="font-mono text-[10px] font-bold tracking-widest text-[var(--color-accent)] uppercase">Open Source · AGPL v3</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 max-w-4xl tracking-tighter">
            AI writes the code.<br />
            <span className="text-[var(--color-accent)]">Sentinel</span> protects it.
          </h1>

          <p className="text-lg md:text-xl text-[var(--color-text-sub)] max-w-2xl mb-10 font-light">
            Transforms TypeScript and JavaScript repos into an interactive blast radius graph with real risk scoring today. AI summaries and PR guardian workflows are planned next, after the graph loop is fully validated.
          </p>

          {/* Waitlist */}
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md mb-16">
            {joined ? (
              <div className="flex-1 text-center font-mono text-sm text-[var(--color-accent)] py-3">✓ You&apos;re on the list.</div>
            ) : (
              <>
                <input
                  type="email"
                  suppressHydrationWarning
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 bg-[var(--color-background-2)] border border-[var(--color-border-sub)] rounded-md px-4 py-3 text-sm font-mono text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
                />
                <button onClick={handleWaitlist} disabled={loading} className="btn-primary px-6 py-3 text-xs disabled:opacity-60">{loading ? 'Joining...' : 'Join Waitlist'}</button>
              </>
            )}
          </div>
          {error && <p className="text-xs text-[var(--color-red)] font-mono mt-2">{error}</p>}

          {/* CTA buttons */}
          <div className="flex flex-wrap gap-4 justify-center mb-16">
            {isLoggedIn ? (
              <>
                <Link href="/dashboard" className="btn-primary px-8 py-3 text-xs">GO TO DASHBOARD →</Link>
                <Link href="/dashboard" className="font-mono text-xs uppercase tracking-wider px-8 py-3 rounded-md border border-[var(--color-border-sub)] text-[var(--color-text-sub)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-all">VIEW DASHBOARD</Link>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-primary px-8 py-3 text-xs">GET STARTED FREE →</Link>
                <Link href="/login" className="font-mono text-xs uppercase tracking-wider px-8 py-3 rounded-md border border-[var(--color-border-sub)] text-[var(--color-text-sub)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-all">SIGN IN</Link>
              </>
            )}
          </div>

          {/* Mock graph card */}
          <div className="relative w-full max-w-3xl border border-[var(--color-border-sub)] rounded-xl overflow-hidden bg-[rgba(17,17,20,0.7)] backdrop-blur-sm p-1">
            <div className="absolute top-3 left-3 flex gap-1.5 z-10">
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-red)]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-amber)]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-green)]" />
            </div>
            <div className="absolute top-3 right-3 z-10">
              <span className="font-mono text-[9px] text-[var(--color-text-muted)] bg-[var(--color-background)] px-2 py-1 rounded">Prototype graph preview</span>
            </div>
            <div className="h-72 flex items-center justify-center relative">
              <GraphPreview />
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-t border-b border-[var(--color-border-main)] py-10 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
              {val:'Real', label:'GRAPH DATA LOOP'},
              {val:'JS/TS', label:'PARSER SUPPORT'},
            {val:'8', label:'NODE TYPES DETECTED'},
              {val:'Local', label:'DEVELOPER MODE'},
          ].map(s => (
            <div key={s.label}>
              <div className="font-display text-3xl font-bold text-[var(--color-accent)]">{s.val}</div>
              <div className="font-mono text-[9px] text-[var(--color-text-muted)] mt-2 tracking-widest">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CAPABILITIES */}
      <section className="py-24 px-6 max-w-6xl mx-auto w-full">
        <div className="mb-16 text-center">
          <p className="font-mono text-[10px] text-[var(--color-accent)] tracking-widest mb-3">CAPABILITIES</p>
          <h2 className="text-4xl font-extrabold tracking-tighter">Built to understand your codebase,<br/>not just read it.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {title:'BFS Blast Radius',sub:'Impact Intelligence',desc:'Instantly computes every file affected by a change using reverse Breadth-First Search — with hop distance and risk scoring at each level.',tags:['middleware','layout','api_route','component']},
            {title:'Full AST Analysis',sub:'Deep Parsing',desc:'Walks every .ts/.tsx file extracting import declarations, dynamic requires, and re-exports. Resolves aliases (@/*) and relative paths precisely.',tags:['ImportDeclaration','CallExpression','ExportAll']},
            {title:'Risk Scorer',sub:'Weighted Intelligence',desc:'Four-component score: volume affected, critical node types, average importance, and proximity. Middleware always forces a HIGH override.',tags:['Volume 40%','Critical 30%','Importance 20%','Proximity 10%']},
            {title:'GitHub Action',sub:'PR Guardian Beta',desc:'The action is wired to read real PR changed files, call the blast-radius API, and update one marked PR comment. Validate it on real repos before treating it as production-ready.',tags:['opened','synchronize','reopened']},
            {title:'Node Classifier',sub:'Type Intelligence',desc:'8 distinct node types detected from file path and AST content — PAGE, LAYOUT, MIDDLEWARE, HOOK, API_ROUTE, COMPONENT, UTIL, SUPABASE_CLIENT.',tags:['page','middleware','hook','component']},
            {title:'AI Summaries',sub:'Coming Soon',desc:'Claude Haiku generates a business-logic summary and a technical implementation summary for every node in your graph. Summarize once, query forever.',tags:['Claude Haiku','topological order','semantic search']},
          ].map(c => (
            <div key={c.title} className="card group hover:border-[var(--color-border-sub)] transition-colors">
              <p className="font-mono text-[9px] text-[var(--color-text-muted)] mb-2 tracking-wider">{c.sub}</p>
              <h3 className="text-lg font-bold mb-3">{c.title}</h3>
              <p className="text-sm text-[var(--color-text-sub)] leading-relaxed mb-4">{c.desc}</p>
              <div className="flex flex-wrap gap-1.5">
                {c.tags.map(t => (
                  <span key={t} className="badge bg-[var(--color-background-3)] text-[var(--color-text-muted)] border border-[var(--color-border-main)]">{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 px-6 border-t border-[var(--color-border-main)]">
        <div className="max-w-5xl mx-auto">
          <div className="mb-16">
            <p className="font-mono text-[10px] text-[var(--color-accent)] tracking-widest mb-3">HOW IT WORKS</p>
            <h2 className="text-4xl font-extrabold tracking-tighter">Engineered for depth.</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {n:'01',title:'Walk the repository',desc:'walkRepo() globs all .ts/.tsx files, skips node_modules, .next, dist, and filters files under 10 bytes. Returns sorted absolute paths.'},
              {n:'02',title:"Parse every file's AST",desc:'parseFile() runs @typescript-eslint/typescript-estree on each file. Extracts static imports, dynamic imports, re-exports, and require() calls.'},
              {n:'03',title:'Classify every node',desc:'classifyNode() applies 8 rules in order (path rules first, content rules second) to assign each file its NodeType. First match wins.'},
              {n:'04',title:'Resolve all imports',desc:'resolveImport() handles relative paths, bare paths, and @/* aliases. Tries 6 extension variants in order. Returns null for npm packages.'},
              {n:'05',title:'Compute importance scores',desc:'In-degree per node is counted across all edges. Score = (in-degree / max-in-degree) × 100. Middleware always gets the highest priority.'},
              {n:'06',title:'Run reverse BFS',desc:'On PR trigger, changed files become the frontier. BFS walks the inverted edge graph, collecting all upstream dependents with hop distances.'},
            ].map(s => (
              <div key={s.n} className="flex gap-5 p-5 bg-[var(--color-background-2)] rounded-xl border border-[var(--color-border-main)] hover:border-[var(--color-border-sub)] transition-colors">
                <span className="font-mono text-[var(--color-accent)] text-2xl font-bold leading-none flex-shrink-0">{s.n}</span>
                <div>
                  <h3 className="font-bold mb-1">{s.title}</h3>
                  <p className="text-sm text-[var(--color-text-sub)] leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NODE TYPES */}
      <section className="py-10 px-6 border-t border-[var(--color-border-main)]">
        <div className="max-w-5xl mx-auto">
          <p className="font-mono text-[10px] text-[var(--color-text-muted)] mb-4 tracking-widest">NODE TYPES DETECTED</p>
          <div className="flex flex-wrap gap-2">
            {['PAGE','LAYOUT','COMPONENT','HOOK','API_ROUTE','MIDDLEWARE','UTIL','SUPABASE_CLIENT'].map((t, i) => {
              const colors = ['#e8ff47','#47b8ff','#a78bfa','#2ed573','#ffa502','#ff4757','#8888a0','#47b8ff']
              return (
                <span key={t} className="badge px-3 py-1.5 rounded-md border font-bold text-[10px]"
                  style={{borderColor:colors[i]+'40',color:colors[i],background:colors[i]+'08'}}>
                  {t}
                </span>
              )
            })}
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section className="py-24 px-6 border-t border-[var(--color-border-main)]">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16">
            <p className="font-mono text-[10px] text-[var(--color-accent)] tracking-widest mb-3">USE CASES</p>
            <h2 className="text-4xl font-extrabold tracking-tighter">Where it clicks.</h2>
            <p className="text-[var(--color-text-sub)] mt-3 max-w-xl">Real workflows where Sentinel replaces guesswork with graph-backed clarity.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {n:'01',title:'PR Blast Radius',desc:'Before any merge, see exactly how many files will be affected, which are high-risk, and what the critical propagation paths are.'},
              {n:'02',title:'Onboarding engineers',desc:'New hire joins — share the graph. They explore auth, middleware, and data flows on their own, at their own pace.'},
              {n:'03',title:'Architecture audits',desc:'Surface load-bearing middleware, circular deps, and high-importance nodes. Find structural risk before it becomes a production incident.'},
              {n:'04',title:'Security reviews',desc:'All high/medium/low risk nodes in one panel. Filter by type, search by file, click to inspect dependencies.'},
              {n:'05',title:'Refactoring safely',desc:'K-hops shows the neighbourhood. Blast radius shows what breaks. Refactor fast without breaking things.'},
              {n:'06',title:'Living documentation',desc:'Every node gets an AI-generated business summary and technical summary. Your codebase documents itself automatically.'},
            ].map(u => (
              <div key={u.n} className="card hover:border-[var(--color-border-sub)] transition-colors">
                <span className="font-mono text-[var(--color-accent)] text-xs mb-3 block">{u.n}</span>
                <h3 className="font-bold mb-2">{u.title}</h3>
                <p className="text-sm text-[var(--color-text-sub)] leading-relaxed">{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THE AI AGE PROBLEM */}
      <section className="py-24 px-6 border-t border-[var(--color-border-main)] bg-[var(--color-background-2)]">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="font-mono text-[10px] text-[var(--color-accent)] tracking-widest mb-4">THE AI AGE PROBLEM</p>
            <h2 className="text-4xl font-extrabold tracking-tighter mb-6">AI writes it.<br/>Sentinel explains it.</h2>
            <p className="text-[var(--color-text-sub)] leading-relaxed mb-6">Cursor, Claude Code, and Copilot let you ship faster than ever — but speed creates a new problem. Codebases grow faster than anyone can understand them. Developers merge code they didn&apos;t fully read. New hires drown in unfamiliar structure.</p>
            <p className="text-[var(--color-text-sub)] leading-relaxed">Sentinel turns that black box into a living, queryable blast-radius map — so your team always knows what will break, and why, before it ever merges.</p>
          </div>
          <div className="space-y-4">
            <div className="p-5 border border-[var(--color-border-sub)] rounded-xl bg-[var(--color-background)]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-[var(--color-red)]" />
                <span className="font-mono text-xs text-[var(--color-text-muted)]">Without Sentinel</span>
              </div>
              <p className="text-sm text-[var(--color-text-sub)]">AI agent edits <code className="text-[var(--color-accent)] bg-[var(--color-accent-bg)] px-1 rounded">lib/auth.ts</code> — PR merged — authentication breaks in 14 other files no one checked.</p>
            </div>
            <div className="p-5 border border-[var(--color-accent-sub)] rounded-xl bg-[var(--color-accent-bg)]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
                <span className="font-mono text-xs text-[var(--color-accent)]">With Sentinel</span>
              </div>
              <p className="text-sm text-[var(--color-text-sub)]">PR opened → Sentinel posts: <strong className="text-[var(--color-text-main)]">🔴 HIGH RISK · 14 affected nodes · middleware impacted</strong>. Team reviews before merge.</p>
            </div>
          </div>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="py-24 px-6 border-t border-[var(--color-border-main)] text-center">
        <div className="max-w-2xl mx-auto">
          <p className="font-mono text-[10px] text-[var(--color-accent)] tracking-widest mb-4">EARLY ACCESS</p>
          <h2 className="text-4xl font-extrabold tracking-tighter mb-4">Not just for teams.<br/>For anyone who ships code.</h2>
          <p className="text-[var(--color-text-sub)] mb-10">GitHub integration, full AI summaries, MCP tooling, and semantic search over your graph — coming soon.</p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            {isLoggedIn ? (
              <Link href="/dashboard" className="btn-primary w-full py-4 text-xs">GO TO DASHBOARD →</Link>
            ) : joined ? (
              <div className="flex-1 text-center font-mono text-sm text-[var(--color-accent)] py-3">✓ You&apos;re on the list. We&apos;ll be in touch.</div>
            ) : (
              <>
                <input type="email" suppressHydrationWarning value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
                  className="flex-1 bg-[var(--color-background-2)] border border-[var(--color-border-sub)] rounded-md px-4 py-3 text-sm font-mono text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]" />
                <button onClick={handleWaitlist} disabled={loading} className="btn-primary px-6 py-3 text-xs disabled:opacity-60">{loading ? 'Joining...' : 'Join Waitlist'}</button>
              </>
            )}
          </div>
          <p className="font-mono text-[9px] text-[var(--color-text-muted)] mt-4">Privacy first: your code never leaves your machine. Cloud sync is always optional.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[var(--color-border-main)] py-8 px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <img src="/sentinel_logo_dark.svg" alt="Sentinel Logo" className="w-4 h-4" />
          <span className="font-display font-bold tracking-wider text-sm uppercase">Sentinel</span>
        </div>
        <p className="font-mono text-[10px] text-[var(--color-text-muted)]">© 2026 Sentinel. Licensed under AGPL v3.</p>
        <div className="flex items-center gap-6">
          <Link href="/" className="font-mono text-[10px] text-[var(--color-text-muted)] hover:text-white transition-colors">HOME</Link>
          <Link href="/dashboard" className="font-mono text-[10px] text-[var(--color-text-muted)] hover:text-white transition-colors">DASHBOARD</Link>
          <a href="https://github.com" className="font-mono text-[10px] text-[var(--color-text-muted)] hover:text-white transition-colors">GITHUB</a>
          <a href="https://docs.sentinel.dev" className="font-mono text-[10px] text-[var(--color-text-muted)] hover:text-white transition-colors">DOCS</a>
        </div>
      </footer>
    </div>
  )
}

function GraphPreview() {
  const nodes = [
    {id:'mw',x:50,y:50,label:'middleware',color:'#ff4757',r:10},
    {id:'layout',x:200,y:40,label:'layout',color:'#ffa502',r:8},
    {id:'page1',x:320,y:30,label:'dashboard/page',color:'#47b8ff',r:7},
    {id:'page2',x:350,y:80,label:'repos/page',color:'#47b8ff',r:7},
    {id:'auth',x:130,y:130,label:'useAuth',color:'#a78bfa',r:9},
    {id:'sb',x:280,y:140,label:'supabase/client',color:'#e8ff47',r:8},
    {id:'graph',x:450,y:60,label:'GraphCanvas',color:'#2ed573',r:7},
    {id:'btn',x:440,y:130,label:'Button',color:'#2ed573',r:5},
  ]
  const edges = [
    ['mw','auth'],['mw','layout'],['layout','page1'],['layout','page2'],
    ['auth','sb'],['page1','graph'],['page2','graph'],['graph','btn'],
  ]
  return (
    <svg viewBox="0 0 520 190" className="w-full h-full" style={{fontFamily:'monospace'}}>
      {edges.map(([s,t]) => {
        const sn = nodes.find(n=>n.id===s)!
        const tn = nodes.find(n=>n.id===t)!
        return <line key={s+t} x1={sn.x} y1={sn.y} x2={tn.x} y2={tn.y} stroke={sn.color} strokeOpacity={0.3} strokeWidth={1} />
      })}
      {nodes.map(n => (
        <g key={n.id}>
          <circle cx={n.x} cy={n.y} r={n.r+4} fill={n.color} opacity={0.06} />
          <circle cx={n.x} cy={n.y} r={n.r} fill={n.color} opacity={0.85} />
          <text x={n.x} y={n.y+n.r+10} textAnchor="middle" fontSize={7} fill="#8888a0">{n.label}</text>
        </g>
      ))}
    </svg>
  )
}
