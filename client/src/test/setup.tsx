import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// ---------- Mock localStorage ----------
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
  get length() { return Object.keys(store).length; },
  key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// ---------- Mock react-router-dom ----------
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({}),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
    NavLink: ({ children, to, ...props }: any) => <a href={to} {...props}>{typeof children === 'function' ? children({ isActive: false }) : children}</a>,
    Link: ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a>,
  };
});

// ---------- Mock API client ----------
vi.mock('../api/client', () => ({
  api: {
    login: vi.fn(),
    register: vi.fn(),
    getMe: vi.fn(),
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
    getSettings: vi.fn().mockResolvedValue({}),
    updateSetting: vi.fn().mockResolvedValue({}),
    getTaxonomy: vi.fn().mockResolvedValue([]),
    getPieces: vi.fn().mockResolvedValue([]),
    getPiece: vi.fn(),
    createPiece: vi.fn(),
    updatePiece: vi.fn(),
    deletePiece: vi.fn(),
    getExercises: vi.fn().mockResolvedValue([]),
    getExercise: vi.fn(),
    createExercise: vi.fn(),
    updateExercise: vi.fn(),
    deleteExercise: vi.fn(),
    getExcerpts: vi.fn().mockResolvedValue([]),
    generateSession: vi.fn(),
    getCurrentSession: vi.fn().mockRejectedValue(new Error('none')),
    getSessions: vi.fn().mockResolvedValue([]),
    getSessionStats: vi.fn().mockResolvedValue({ weekHours: 0, weekSessions: 0, streak: 0 }),
    startSession: vi.fn(),
    completeBlock: vi.fn(),
    skipBlock: vi.fn(),
    completeSession: vi.fn(),
    getTodayRotation: vi.fn().mockResolvedValue([]),
    getAnalyticsTimeByCategory: vi.fn().mockResolvedValue({}),
    getAnalyticsTrends: vi.fn().mockResolvedValue(null),
    getAnalyticsStalledPieces: vi.fn().mockResolvedValue([]),
    getAnalyticsDrift: vi.fn().mockResolvedValue(null),
    getSessionHistory: vi.fn().mockResolvedValue(null),
    getFeed: vi.fn().mockResolvedValue([]),
    getChallenges: vi.fn().mockResolvedValue([]),
    getFollowers: vi.fn().mockResolvedValue([]),
    getFollowing: vi.fn().mockResolvedValue([]),
    searchUsers: vi.fn().mockResolvedValue([]),
    followUser: vi.fn(),
    unfollowUser: vi.fn(),
    markRotationPracticed: vi.fn(),
  },
  setAuthToken: vi.fn(),
  getAuthToken: vi.fn(() => null),
}));

// ---------- Mock opensheetmusicdisplay ----------
vi.mock('opensheetmusicdisplay', () => ({
  OpenSheetMusicDisplay: vi.fn().mockImplementation(() => ({
    load: vi.fn().mockResolvedValue(undefined),
    render: vi.fn(),
    setOptions: vi.fn(),
  })),
}));

// ---------- Mock Web Audio API ----------
class MockAudioContext {
  sampleRate = 44100;
  state = 'running';
  createAnalyser() { return { fftSize: 2048, frequencyBinCount: 1024, getFloatTimeDomainData: vi.fn(), getByteFrequencyData: vi.fn(), connect: vi.fn(), disconnect: vi.fn() }; }
  createMediaStreamSource() { return { connect: vi.fn(), disconnect: vi.fn() }; }
  createGain() { return { gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() }; }
  createOscillator() { return { frequency: { value: 440 }, type: 'sine', connect: vi.fn(), start: vi.fn(), stop: vi.fn(), disconnect: vi.fn() }; }
  close() { return Promise.resolve(); }
  resume() { return Promise.resolve(); }
  suspend() { return Promise.resolve(); }
  get destination() { return {}; }
}
(window as any).AudioContext = MockAudioContext;
(window as any).webkitAudioContext = MockAudioContext;

// ---------- Mock MediaRecorder ----------
class MockMediaRecorder {
  state = 'inactive';
  ondataavailable: ((e: any) => void) | null = null;
  onstop: (() => void) | null = null;
  start() { this.state = 'recording'; }
  stop() { this.state = 'inactive'; this.onstop?.(); }
  static isTypeSupported() { return true; }
}
(window as any).MediaRecorder = MockMediaRecorder;

// ---------- Mock navigator.mediaDevices ----------
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }),
    enumerateDevices: vi.fn().mockResolvedValue([]),
  },
  writable: true,
});

// ---------- Mock recharts ----------
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => null,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  RadarChart: ({ children }: any) => <div data-testid="radar-chart">{children}</div>,
  Radar: () => null,
  PolarGrid: () => null,
  PolarAngleAxis: () => null,
  PolarRadiusAxis: () => null,
}));

// ---------- Mock themes/tokens ----------
vi.mock('../themes/tokens', () => ({
  themes: {
    light: { '--pf-bg-primary': '#faf9f7' },
    dark: { '--pf-bg-primary': '#0d1117' },
    midnight: { '--pf-bg-primary': '#000000' },
  },
}));

// ---------- Mock ThemeProvider ----------
vi.mock('../themes/ThemeProvider', () => ({
  useTheme: () => ({
    theme: 'dark' as const,
    setTheme: vi.fn(),
    highContrast: false,
    setHighContrast: vi.fn(),
    colourVisionMode: 'none',
    setColourVisionMode: vi.fn(),
    reducedMotion: false,
    setReducedMotion: vi.fn(),
    fontSize: 1,
    setFontSize: vi.fn(),
    applyCustomTokens: vi.fn(),
  }),
  ThemeProvider: ({ children }: any) => <>{children}</>,
}));

// ---------- Mock community components used in settings ----------
vi.mock('../components/community/ThemeGallery', () => ({
  ThemeGallery: () => <div data-testid="theme-gallery">Theme Gallery</div>,
}));
vi.mock('../components/community/ThemeCreator', () => ({
  ThemeCreator: ({ open }: any) => open ? <div data-testid="theme-creator">Theme Creator</div> : null,
}));
vi.mock('../components/community/CreateChallengeModal', () => ({
  CreateChallengeModal: ({ open }: any) => open ? <div data-testid="create-challenge-modal">Create Challenge Modal</div> : null,
}));
vi.mock('../components/composition/GenerateExerciseModal', () => ({
  GenerateExerciseModal: ({ open }: any) => open ? <div data-testid="generate-exercise-modal">Generate Exercise Modal</div> : null,
}));

// ---------- Mock analytics components ----------
vi.mock('../components/analytics/PeriodSummary', () => ({
  PeriodSummary: () => <div data-testid="period-summary">Period Summary</div>,
}));
vi.mock('../components/analytics/TimeDistributionChart', () => ({
  TimeDistributionChart: () => <div data-testid="time-distribution-chart">Time Distribution</div>,
}));
vi.mock('../components/analytics/DriftChart', () => ({
  DriftChart: () => <div data-testid="drift-chart">Drift Chart</div>,
}));
vi.mock('../components/analytics/SessionHistoryList', () => ({
  SessionHistoryList: () => <div data-testid="session-history-list">Session History</div>,
}));

// ---------- Export mockNavigate for tests ----------
export { mockNavigate };
