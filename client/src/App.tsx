import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./components/layout/MainLayout";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { DashboardPage } from "./pages/DashboardPage";
import { PiecesPage } from "./pages/PiecesPage";
import { PieceDetailPage } from "./pages/PieceDetailPage";
import { ExercisesPage } from "./pages/ExercisesPage";
import { ExcerptsPage } from "./pages/ExcerptsPage";
import { TaxonomyPage } from "./pages/TaxonomyPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SessionPage } from "./pages/SessionPage";
import { MediaLibraryPage } from "./pages/MediaLibraryPage";
import { ScoreAnalysisPage } from "./pages/ScoreAnalysisPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { RecordingPage } from "./pages/RecordingPage";
import { LoginPage } from "./pages/LoginPage";
import { TutorialPage } from "./pages/TutorialPage";
import { ProfilePage } from "./pages/ProfilePage";
import { AssessmentsPage } from "./pages/AssessmentsPage";
import { CommunityPage } from "./pages/CommunityPage";
import { PricingPage } from "./pages/PricingPage";
import { CalendarPage } from "./pages/CalendarPage";
import { AuditionsPage } from "./pages/AuditionsPage";
import { OnboardingWizard } from "./components/onboarding/OnboardingWizard";
import { Loader } from "lucide-react";
import { useExperienceLevel, isPathAllowed } from "./hooks/useExperienceLevel";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState(
    () => localStorage.getItem("pf-onboarding-complete") === "true",
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--pf-bg-primary)]">
        <Loader
          size={24}
          className="animate-spin text-[var(--pf-accent-gold)]"
        />
      </div>
    );
  }

  // In dev mode (no AUTH_REQUIRED), the server allows all requests anyway,
  // and getMe will succeed with the dev-user fallback. So isAuthenticated
  // will be true even without logging in. When AUTH_REQUIRED=true on the
  // server, the user must have a real token.
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Show onboarding wizard for new users
  if (!onboardingDone) {
    return <OnboardingWizard onComplete={() => setOnboardingDone(true)} />;
  }

  return <>{children}</>;
}

function RequireLevel({
  path,
  children,
}: {
  path: string;
  children: React.ReactNode;
}) {
  const { level, isLoading } = useExperienceLevel();
  if (isLoading) return null;
  if (!isPathAllowed(path, level)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route path="tutorial" element={<TutorialPage />} />
      <Route
        element={
          <RequireAuth>
            <MainLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="pieces" element={<PiecesPage />} />
        <Route path="pieces/:id" element={<PieceDetailPage />} />
        <Route
          path="exercises"
          element={
            <RequireLevel path="/exercises">
              <ExercisesPage />
            </RequireLevel>
          }
        />
        <Route
          path="excerpts"
          element={
            <RequireLevel path="/excerpts">
              <ExcerptsPage />
            </RequireLevel>
          }
        />
        <Route
          path="taxonomy"
          element={
            <RequireLevel path="/taxonomy">
              <TaxonomyPage />
            </RequireLevel>
          }
        />
        <Route path="session" element={<SessionPage />} />
        <Route
          path="media"
          element={
            <RequireLevel path="/media">
              <MediaLibraryPage />
            </RequireLevel>
          }
        />
        <Route
          path="scores/:fileId"
          element={
            <RequireLevel path="/scores">
              <ScoreAnalysisPage />
            </RequireLevel>
          }
        />
        <Route path="record" element={<RecordingPage />} />
        <Route
          path="assessments"
          element={
            <RequireLevel path="/assessments">
              <AssessmentsPage />
            </RequireLevel>
          }
        />
        <Route
          path="community"
          element={
            <RequireLevel path="/community">
              <CommunityPage />
            </RequireLevel>
          }
        />
        <Route
          path="analytics"
          element={
            <RequireLevel path="/analytics">
              <AnalyticsPage />
            </RequireLevel>
          }
        />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="auditions" element={<AuditionsPage />} />
        <Route
          path="profile"
          element={
            <RequireLevel path="/profile">
              <ProfilePage />
            </RequireLevel>
          }
        />
        <Route path="pricing" element={<PricingPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="tutorial" element={<TutorialPage />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
