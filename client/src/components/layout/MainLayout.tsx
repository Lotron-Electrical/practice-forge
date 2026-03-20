import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { Menu } from "lucide-react";
import { QuickLogFab } from "../QuickLogFab";

export function MainLayout() {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Lock body scroll when drawer is open on mobile
  useEffect(() => {
    if (isMobile && drawerOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isMobile, drawerOpen]);

  return (
    <div className="flex min-h-screen bg-[var(--pf-bg-primary)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-pf focus:text-sm focus:font-medium"
        style={{ backgroundColor: "var(--pf-accent-gold)", color: "white" }}
      >
        Skip to main content
      </a>

      {/* Mobile header */}
      {isMobile && (
        <header className="fixed top-0 left-0 right-0 z-30 h-14 flex items-center gap-3 px-4 bg-[var(--pf-bg-nav)]">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 -ml-2 text-[var(--pf-text-nav)] hover:bg-white/10 rounded-pf-sm"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-baseline gap-1.5">
            <span className="text-white font-heading font-bold text-base tracking-tight">
              PRACTICE
            </span>
            <span
              className="font-heading font-bold text-base tracking-tight"
              style={{ color: "var(--pf-accent-gold)" }}
            >
              FORGE
            </span>
          </div>
        </header>
      )}

      <Sidebar
        isMobile={isMobile}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      <main
        id="main-content"
        className={`flex-1 overflow-auto ${isMobile ? "pt-14" : ""}`}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          <Outlet />
        </div>
      </main>

      <QuickLogFab />
    </div>
  );
}
