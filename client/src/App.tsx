import { Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
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
import { PlaceholderPage } from './pages/PlaceholderPage';
import { Mic, BarChart3, Users } from 'lucide-react';

export function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="pieces" element={<PiecesPage />} />
        <Route path="pieces/:id" element={<PieceDetailPage />} />
        <Route path="exercises" element={<ExercisesPage />} />
        <Route path="excerpts" element={<ExcerptsPage />} />
        <Route path="taxonomy" element={<TaxonomyPage />} />
        <Route path="session" element={<SessionPage />} />
        <Route path="media" element={<MediaLibraryPage />} />
        <Route path="scores/:fileId" element={<ScoreAnalysisPage />} />
        <Route path="record" element={<PlaceholderPage title="Record" description="Audio recording and feedback will be available here." icon={<Mic size={48} />} />} />
        <Route path="audits" element={<PlaceholderPage title="Audits & Assessments" description="Piece audits, technique assessments, and weekly reviews." icon={<BarChart3 size={48} />} />} />
        <Route path="community" element={<PlaceholderPage title="Community" description="Challenges, leaderboards, and shared progress." icon={<Users size={48} />} />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
