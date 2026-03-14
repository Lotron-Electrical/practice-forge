import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { DashboardPage } from './pages/DashboardPage';
import { PiecesPage } from './pages/PiecesPage';
import { PieceDetailPage } from './pages/PieceDetailPage';
import { ExercisesPage } from './pages/ExercisesPage';
import { ExcerptsPage } from './pages/ExcerptsPage';
import { TaxonomyPage } from './pages/TaxonomyPage';
import { SettingsPage } from './pages/SettingsPage';
import { SessionPage } from './pages/SessionPage';
import { MediaLibraryPage } from './pages/MediaLibraryPage';
import { ScoreAnalysisPage } from './pages/ScoreAnalysisPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { RecordingPage } from './pages/RecordingPage';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { AssessmentsPage } from './pages/AssessmentsPage';
import { CommunityPage } from './pages/CommunityPage';
import { Loader } from 'lucide-react';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--pf-bg-primary)]">
        <Loader size={24} className="animate-spin text-[var(--pf-accent-gold)]" />
      </div>
    );
  }

  // In dev mode (no AUTH_REQUIRED), the server allows all requests anyway,
  // and getMe will succeed with the dev-user fallback. So isAuthenticated
  // will be true even without logging in. When AUTH_REQUIRED=true on the
  // server, the user must have a real token.
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<RequireAuth><MainLayout /></RequireAuth>}>
        <Route index element={<DashboardPage />} />
        <Route path="pieces" element={<PiecesPage />} />
        <Route path="pieces/:id" element={<PieceDetailPage />} />
        <Route path="exercises" element={<ExercisesPage />} />
        <Route path="excerpts" element={<ExcerptsPage />} />
        <Route path="taxonomy" element={<TaxonomyPage />} />
        <Route path="session" element={<SessionPage />} />
        <Route path="media" element={<MediaLibraryPage />} />
        <Route path="scores/:fileId" element={<ScoreAnalysisPage />} />
        <Route path="record" element={<RecordingPage />} />
        <Route path="assessments" element={<AssessmentsPage />} />
        <Route path="community" element={<CommunityPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
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
