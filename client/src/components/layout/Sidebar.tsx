import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Music, BookOpen, ListMusic, Mic, BarChart3, Users, Settings, ChevronLeft, ChevronRight, Tags, Timer } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/pieces', icon: Music, label: 'Pieces' },
  { to: '/exercises', icon: BookOpen, label: 'Exercises' },
  { to: '/excerpts', icon: ListMusic, label: 'Excerpts' },
  { to: '/taxonomy', icon: Tags, label: 'Taxonomy' },
  { to: '/session', icon: Timer, label: 'Session' },
  { to: '/record', icon: Mic, label: 'Record' },
  { to: '/audits', icon: BarChart3, label: 'Audits' },
  { to: '/community', icon: Users, label: 'Community' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`flex flex-col bg-[var(--pf-bg-nav)] text-[var(--pf-text-nav)] h-screen sticky top-0 transition-all ${collapsed ? 'w-16' : 'w-56'}`}
      style={{ transitionDuration: 'var(--pf-animation-duration)' }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2 px-4 py-5">
        {!collapsed && (
          <div className="flex flex-col leading-tight">
            <span className="text-white font-heading font-bold text-lg tracking-tight">PRACTICE</span>
            <span className="font-heading font-bold text-lg tracking-tight" style={{ color: 'var(--pf-accent-gold)' }}>FORGE</span>
          </div>
        )}
        {collapsed && (
          <span className="font-heading font-bold text-lg" style={{ color: 'var(--pf-accent-gold)' }}>PF</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 px-2 mt-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-pf-sm text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white/10 text-[var(--pf-text-nav-active)]'
                  : 'hover:bg-white/5 text-[var(--pf-text-nav)]'
              }`
            }
            title={label}
          >
            <Icon size={20} />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center p-3 hover:bg-white/5 text-[var(--pf-text-nav)] transition-colors"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
    </aside>
  );
}
