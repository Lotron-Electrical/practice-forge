import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Music,
  BookOpen,
  ListMusic,
  FolderOpen,
  Mic,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Timer,
  X,
  User,
  ClipboardCheck,
  Users,
  ChevronDown,
  CreditCard,
  CalendarDays,
  Target,
  HelpCircle,
} from "lucide-react";
import { useState, useEffect, useMemo, type ReactNode } from "react";
import {
  useExperienceLevel,
  isNavItemAllowed,
} from "../../hooks/useExperienceLevel";
import { useModalLock } from "../../hooks/useModalLock";

// Grouped navigation structure
type NavItem = { to: string; icon: typeof LayoutDashboard; label: string };
type NavGroup = {
  header: string | null;
  items: NavItem[];
  collapsible?: boolean;
};

const navGroups: NavGroup[] = [
  {
    header: null,
    items: [{ to: "/", icon: LayoutDashboard, label: "Dashboard" }],
  },
  {
    header: "Practice",
    items: [
      { to: "/session", icon: Timer, label: "Session" },
      { to: "/record", icon: Mic, label: "Record" },
    ],
  },
  {
    header: "Library",
    items: [
      { to: "/pieces", icon: Music, label: "Pieces" },
      { to: "/exercises", icon: BookOpen, label: "Exercises" },
      { to: "/excerpts", icon: ListMusic, label: "Excerpts" },
    ],
  },
  {
    header: "Progress",
    items: [
      { to: "/analytics", icon: BarChart3, label: "Analytics" },
      { to: "/calendar", icon: CalendarDays, label: "Calendar" },
      { to: "/assessments", icon: ClipboardCheck, label: "Assessments" },
      { to: "/auditions", icon: Target, label: "Auditions" },
    ],
  },
  {
    header: "More",
    collapsible: true,
    items: [
      { to: "/community", icon: Users, label: "Community" },
      { to: "/media", icon: FolderOpen, label: "Media" },
      { to: "/profile", icon: User, label: "Profile" },
      { to: "/pricing", icon: CreditCard, label: "Pricing" },
      { to: "/tutorial", icon: HelpCircle, label: "Help & Tour" },
      { to: "/settings", icon: Settings, label: "Settings" },
    ],
  },
];

const MORE_EXPANDED_KEY = "pf-sidebar-more-expanded";

function getStoredMoreExpanded(): boolean {
  try {
    return localStorage.getItem(MORE_EXPANDED_KEY) === "true";
  } catch {
    return false;
  }
}

interface SidebarProps {
  isMobile: boolean;
  isOpen: boolean;
  onClose: () => void;
}

function SectionHeader({
  label,
  collapsed,
}: {
  label: string;
  collapsed: boolean;
}) {
  if (collapsed) {
    return <div className="mx-auto my-2 w-6 border-t border-white/20" />;
  }
  return (
    <div className="text-xs uppercase tracking-wider text-[var(--pf-text-nav)]/50 px-4 pt-4 pb-1 select-none">
      {label}
    </div>
  );
}

function NavItemLink({
  item,
  sidebarCollapsed,
  onClick,
  mobile,
}: {
  item: NavItem;
  sidebarCollapsed: boolean;
  onClick?: () => void;
  mobile?: boolean;
}) {
  const { to, icon: Icon, label } = item;
  const py = mobile ? "py-3.5" : "py-2.5";
  const px = mobile ? "px-4" : "px-3";
  return (
    <NavLink
      key={to}
      to={to}
      end={to === "/"}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 ${px} ${py} rounded-pf-sm text-sm font-medium transition-colors ${
          isActive
            ? "bg-white/10 text-[var(--pf-text-nav-active)]"
            : "hover:bg-white/5 text-[var(--pf-text-nav)]"
        }`
      }
      title={label}
    >
      <Icon size={20} />
      {!sidebarCollapsed && <span>{label}</span>}
    </NavLink>
  );
}

export function Sidebar({ isMobile, isOpen, onClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [moreExpanded, setMoreExpanded] = useState(getStoredMoreExpanded);
  const { level } = useExperienceLevel();
  useModalLock(isMobile && isOpen);

  // Filter nav groups based on experience level
  const filteredNavGroups = useMemo(() => {
    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          isNavItemAllowed(item.label, level),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [level]);

  useEffect(() => {
    try {
      localStorage.setItem(MORE_EXPANDED_KEY, String(moreExpanded));
    } catch {
      // ignore
    }
  }, [moreExpanded]);

  function renderGroups({
    sidebarCollapsed,
    onClick,
    mobile,
    forceMoreOpen,
  }: {
    sidebarCollapsed: boolean;
    onClick?: () => void;
    mobile?: boolean;
    forceMoreOpen?: boolean;
  }): ReactNode {
    return filteredNavGroups.map((group, gi) => {
      const isMore = group.collapsible;
      const showItems = !isMore || forceMoreOpen || moreExpanded;

      return (
        <div key={gi}>
          {group.header && !isMore && (
            <SectionHeader label={group.header} collapsed={sidebarCollapsed} />
          )}

          {isMore &&
            group.header &&
            (sidebarCollapsed ? (
              <div className="mx-auto my-2 w-6 border-t border-white/20" />
            ) : forceMoreOpen ? (
              <SectionHeader label={group.header} collapsed={false} />
            ) : (
              <button
                onClick={() => setMoreExpanded((v) => !v)}
                className="flex items-center justify-between w-full text-xs uppercase tracking-wider text-[var(--pf-text-nav)]/50 px-4 pt-4 pb-1 hover:text-[var(--pf-text-nav)]/80 transition-colors select-none"
              >
                <span>{group.header}</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform ${moreExpanded ? "rotate-180" : ""}`}
                />
              </button>
            ))}

          {showItems &&
            group.items.map((item) => (
              <NavItemLink
                key={item.to}
                item={item}
                sidebarCollapsed={sidebarCollapsed}
                onClick={onClick}
                mobile={mobile}
              />
            ))}
        </div>
      );
    });
  }

  // Mobile: off-canvas drawer
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        {isOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 transition-opacity"
            onClick={onClose}
          />
        )}

        {/* Drawer */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-[var(--pf-bg-nav)] text-[var(--pf-text-nav)] transition-transform duration-300 ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Drawer header */}
          <div className="flex items-center justify-between px-4 py-5">
            <div className="flex flex-col leading-tight">
              <span className="text-white font-heading font-bold text-lg tracking-tight">
                PRACTICE
              </span>
              <span
                className="font-heading font-bold text-lg tracking-tight"
                style={{ color: "var(--pf-accent-gold)" }}
              >
                FORGE
              </span>
              <span
                className="text-[10px] tracking-wide mt-0.5"
                style={{ color: "var(--pf-text-nav)", opacity: 0.4 }}
              >
                v0.20.Jolivet
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-[var(--pf-text-nav)] hover:bg-white/10 rounded-pf-sm"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation — larger touch targets, More always expanded */}
          <nav className="flex-1 flex flex-col gap-1 px-2 mt-2 overflow-y-auto">
            {renderGroups({
              sidebarCollapsed: false,
              onClick: onClose,
              mobile: true,
              forceMoreOpen: true,
            })}
          </nav>
        </aside>
      </>
    );
  }

  // Desktop: original sticky sidebar
  return (
    <aside
      className={`flex flex-col bg-[var(--pf-bg-nav)] text-[var(--pf-text-nav)] h-screen sticky top-0 transition-all ${collapsed ? "w-16" : "w-56"}`}
      style={{ transitionDuration: "var(--pf-animation-duration)" }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2 px-4 py-5">
        {!collapsed && (
          <div className="flex flex-col leading-tight">
            <span className="text-white font-heading font-bold text-lg tracking-tight">
              PRACTICE
            </span>
            <span
              className="font-heading font-bold text-lg tracking-tight"
              style={{ color: "var(--pf-accent-gold)" }}
            >
              FORGE
            </span>
            <span
              className="text-[10px] tracking-wide mt-0.5"
              style={{ color: "var(--pf-text-nav)", opacity: 0.4 }}
            >
              v0.20.Jolivet
            </span>
          </div>
        )}
        {collapsed && (
          <span
            className="font-heading font-bold text-lg"
            style={{ color: "var(--pf-accent-gold)" }}
          >
            PF
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 px-2 mt-2 overflow-y-auto">
        {renderGroups({ sidebarCollapsed: collapsed })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center p-3 hover:bg-white/5 text-[var(--pf-text-nav)] transition-colors"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
    </aside>
  );
}
