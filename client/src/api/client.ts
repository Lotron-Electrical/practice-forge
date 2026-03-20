// Thin fetch wrapper — swap base URL for mobile

const BASE_URL = "/api";

// Token storage for auth
let authToken: string | null = localStorage.getItem("pf_token");

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) localStorage.setItem("pf_token", token);
  else localStorage.removeItem("pf_token");
}

export function getAuthToken() {
  return authToken;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    headers,
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

async function uploadRequest<T>(path: string, formData: FormData): Promise<T> {
  const headers: Record<string, string> = {};
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  // Auth
  register: (data: {
    email: string;
    password: string;
    display_name?: string;
    instrument?: string;
    level?: string;
  }) =>
    request("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (email: string, password: string) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  getMe: () => request("/auth/me"),
  updateProfile: (data: unknown) =>
    request("/auth/me", { method: "PUT", body: JSON.stringify(data) }),
  changePassword: (current_password: string, new_password: string) =>
    request("/auth/me/password", {
      method: "PUT",
      body: JSON.stringify({ current_password, new_password }),
    }),

  // Settings
  getSettings: () => request<Record<string, unknown>>("/settings"),
  updateSetting: (key: string, value: unknown) =>
    request(`/settings/${key}`, {
      method: "PUT",
      body: JSON.stringify({ value }),
    }),

  // Taxonomy
  getTaxonomy: () => request<unknown[]>("/taxonomy"),
  createCategory: (data: unknown) =>
    request("/taxonomy", { method: "POST", body: JSON.stringify(data) }),
  updateCategory: (id: string, data: unknown) =>
    request(`/taxonomy/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteCategory: (id: string) =>
    request(`/taxonomy/${id}`, { method: "DELETE" }),

  // Pieces
  getPieces: () => request<unknown[]>("/pieces"),
  getPiece: (id: string) => request(`/pieces/${id}`),
  createPiece: (data: unknown) =>
    request("/pieces", { method: "POST", body: JSON.stringify(data) }),
  updatePiece: (id: string, data: unknown) =>
    request(`/pieces/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deletePiece: (id: string) => request(`/pieces/${id}`, { method: "DELETE" }),

  // Sections
  createSection: (pieceId: string, data: unknown) =>
    request(`/pieces/${pieceId}/sections`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateSection: (pieceId: string, sectionId: string, data: unknown) =>
    request(`/pieces/${pieceId}/sections/${sectionId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteSection: (pieceId: string, sectionId: string) =>
    request(`/pieces/${pieceId}/sections/${sectionId}`, { method: "DELETE" }),

  // Technical Demands
  createDemand: (pieceId: string, data: unknown) =>
    request(`/pieces/${pieceId}/demands`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateDemand: (pieceId: string, demandId: string, data: unknown) =>
    request(`/pieces/${pieceId}/demands/${demandId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteDemand: (pieceId: string, demandId: string) =>
    request(`/pieces/${pieceId}/demands/${demandId}`, { method: "DELETE" }),
  linkExerciseToDemand: (
    pieceId: string,
    demandId: string,
    exerciseId: string,
  ) =>
    request(`/pieces/${pieceId}/demands/${demandId}/exercises`, {
      method: "POST",
      body: JSON.stringify({ exercise_id: exerciseId }),
    }),
  unlinkExerciseFromDemand: (
    pieceId: string,
    demandId: string,
    exerciseId: string,
  ) =>
    request(`/pieces/${pieceId}/demands/${demandId}/exercises/${exerciseId}`, {
      method: "DELETE",
    }),

  // Exercises
  getExercises: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<unknown[]>(`/exercises${qs}`);
  },
  getExercise: (id: string) => request(`/exercises/${id}`),
  createExercise: (data: unknown) =>
    request("/exercises", { method: "POST", body: JSON.stringify(data) }),
  updateExercise: (id: string, data: unknown) =>
    request(`/exercises/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteExercise: (id: string) =>
    request(`/exercises/${id}`, { method: "DELETE" }),

  // Excerpts
  getExcerpts: () => request<unknown[]>("/excerpts"),
  getExcerpt: (id: string) => request(`/excerpts/${id}`),
  createExcerpt: (data: unknown) =>
    request("/excerpts", { method: "POST", body: JSON.stringify(data) }),
  updateExcerpt: (id: string, data: unknown) =>
    request(`/excerpts/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteExcerpt: (id: string) =>
    request(`/excerpts/${id}`, { method: "DELETE" }),

  // Sessions
  generateSession: (duration_min: number, audition_mode?: boolean) =>
    request("/sessions/generate", {
      method: "POST",
      body: JSON.stringify({ duration_min, audition_mode }),
    }),
  getCurrentSession: () => request("/sessions/current"),
  getSessions: () => request<unknown[]>("/sessions"),
  getLatestCompleted: () => request("/sessions/latest-completed"),
  duplicateSession: (id: string) =>
    request(`/sessions/${id}/duplicate`, { method: "POST" }),
  getSessionStats: () => request("/sessions/stats"),
  startSession: (id: string) =>
    request(`/sessions/${id}/start`, { method: "PUT" }),
  completeBlock: (
    sessionId: string,
    blockId: string,
    data?: { actual_duration_min?: number; notes?: string },
  ) =>
    request(`/sessions/${sessionId}/blocks/${blockId}/complete`, {
      method: "PUT",
      body: JSON.stringify(data || {}),
    }),
  skipBlock: (sessionId: string, blockId: string) =>
    request(`/sessions/${sessionId}/blocks/${blockId}/skip`, { method: "PUT" }),
  completeSession: (id: string, data?: { rating?: string; notes?: string }) =>
    request(`/sessions/${id}/complete`, {
      method: "PUT",
      body: JSON.stringify(data || {}),
    }),
  quickLog: (data: {
    notes: string;
    duration_min: number;
    date?: string;
    rating?: string;
  }) =>
    request("/sessions/quick-log", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  // Session Templates
  getSessionTemplates: () => request<unknown[]>("/sessions/templates"),
  saveSessionTemplate: (data: {
    name: string;
    planned_duration_min: number;
    blocks: unknown[];
  }) =>
    request("/sessions/templates", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteSessionTemplate: (id: string) =>
    request(`/sessions/templates/${id}`, { method: "DELETE" }),
  useSessionTemplate: (id: string) =>
    request(`/sessions/templates/${id}/use`, { method: "POST" }),
  getTodayRotation: () => request<unknown[]>("/sessions/rotation/today"),
  markRotationPracticed: (rotationId: string) =>
    request(`/sessions/rotation/${rotationId}/practiced`, { method: "POST" }),

  // Analytics
  getAnalyticsTimeByCategory: (period?: string) =>
    request(
      `/sessions/analytics/time-by-category${period ? `?period=${period}` : ""}`,
    ),
  getAnalyticsTrends: (period?: string) =>
    request(`/sessions/analytics/trends${period ? `?period=${period}` : ""}`),
  getAnalyticsStalledPieces: () =>
    request<unknown[]>("/sessions/analytics/stalled-pieces"),
  getAnalyticsDrift: () => request("/sessions/analytics/drift"),
  getAnalyticsCalendar: (months?: number) =>
    request<
      Array<{
        date: string;
        sessions: number;
        minutes: number;
        rating: string | null;
      }>
    >(`/sessions/analytics/calendar${months ? `?months=${months}` : ""}`),
  getAnalyticsStreaks: () =>
    request<{
      current_streak: number;
      longest_streak: number;
      total_practice_days: number;
      total_hours: number;
    }>("/sessions/analytics/streaks"),
  getSessionHistory: (params?: {
    page?: number;
    limit?: number;
    from?: string;
    to?: string;
  }) => {
    const qs = params
      ? "?" +
        new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)]),
        ).toString()
      : "";
    return request(`/sessions/analytics/history${qs}`);
  },

  // Files
  uploadFile: (
    file: File,
    metadata?: {
      linked_type?: string;
      linked_id?: string;
      notes?: string;
      tags?: string[];
    },
  ) => {
    const fd = new FormData();
    fd.append("file", file);
    if (metadata?.linked_type) fd.append("linked_type", metadata.linked_type);
    if (metadata?.linked_id) fd.append("linked_id", metadata.linked_id);
    if (metadata?.notes) fd.append("notes", metadata.notes);
    if (metadata?.tags) fd.append("tags", JSON.stringify(metadata.tags));
    return uploadRequest<unknown>("/files", fd);
  },
  getFiles: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<unknown[]>(`/files${qs}`);
  },
  getFile: (id: string) => request(`/files/${id}`),
  updateFile: (id: string, data: unknown) =>
    request(`/files/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteFile: (id: string) => request(`/files/${id}`, { method: "DELETE" }),
  linkFile: (id: string, linked_type: string, linked_id: string) =>
    request(`/files/${id}/link`, {
      method: "POST",
      body: JSON.stringify({ linked_type, linked_id }),
    }),
  unlinkFile: (id: string) =>
    request(`/files/${id}/link`, { method: "DELETE" }),
  getFileDownloadUrl: (id: string) => `/api/files/${id}/download`,

  // Analysis
  triggerOmr: (fileId: string) =>
    request(`/analysis/trigger-omr/${fileId}`, { method: "POST" }),
  triggerAnalysis: (fileId: string) =>
    request(`/analysis/trigger-analysis/${fileId}`, { method: "POST" }),
  triggerClaudeEnhance: (analysisId: string, confirmed?: boolean) =>
    request(`/analysis/trigger-claude/${analysisId}`, {
      method: "POST",
      body: JSON.stringify({ confirmed }),
    }),
  getOmrResult: (fileId: string) => request(`/analysis/omr/${fileId}`),
  getAnalysisResult: (fileId: string) => request(`/analysis/results/${fileId}`),
  getAnalysisDemands: (analysisId: string) =>
    request<unknown[]>(`/analysis/demands/${analysisId}`),
  importDemand: (demandId: string, pieceId: string) =>
    request(`/analysis/demands/${demandId}/import`, {
      method: "POST",
      body: JSON.stringify({ piece_id: pieceId }),
    }),
  getAnalysisStatus: (fileId: string) => request(`/analysis/status/${fileId}`),
  getMusicXmlUrl: (fileId: string) => `/api/files/${fileId}/musicxml`,

  // Resources
  getResources: (params: { linked_type: string; linked_id: string }) => {
    const qs = new URLSearchParams(params).toString();
    return request<unknown[]>(`/resources?${qs}`);
  },
  createResource: (data: unknown) =>
    request("/resources", { method: "POST", body: JSON.stringify(data) }),
  deleteResource: (id: string) =>
    request(`/resources/${id}`, { method: "DELETE" }),
  searchImslp: (q: string) =>
    request<unknown[]>(`/resources/search/imslp?q=${encodeURIComponent(q)}`),
  searchWikipedia: (q: string) =>
    request<unknown[]>(
      `/resources/search/wikipedia?q=${encodeURIComponent(q)}`,
    ),
  searchYoutube: (q: string) =>
    request<unknown[]>(`/resources/search/youtube?q=${encodeURIComponent(q)}`),
  autoDiscover: (data: { title: string; composer?: string }) =>
    request("/resources/auto-discover", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Recordings
  createRecording: (audioBlob: Blob, metadata: Record<string, string>) => {
    const fd = new FormData();
    fd.append("file", audioBlob, metadata.filename || "recording.webm");
    Object.entries(metadata).forEach(([k, v]) => {
      if (v && k !== "filename") fd.append(k, v);
    });
    return uploadRequest<unknown>("/recordings", fd);
  },
  getRecordings: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<unknown[]>(`/recordings${qs}`);
  },
  getRecording: (id: string) => request(`/recordings/${id}`),
  deleteRecording: (id: string) =>
    request(`/recordings/${id}`, { method: "DELETE" }),
  saveAnalysis: (recordingId: string, data: unknown) =>
    request(`/recordings/${recordingId}/analysis`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getRecordingAnalysis: (recordingId: string) =>
    request(`/recordings/${recordingId}/analysis`),
  getRecordingAudioUrl: (fileId: string) => `/api/files/${fileId}/download`,

  // Assessments
  createAssessment: (data: {
    type: string;
    piece_id?: string;
    notes?: string;
  }) => request("/assessments", { method: "POST", body: JSON.stringify(data) }),
  getAssessments: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<unknown[]>(`/assessments${qs}`);
  },
  getAssessment: (id: string) => request(`/assessments/${id}`),
  updateAssessment: (id: string, data: unknown) =>
    request(`/assessments/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteAssessment: (id: string) =>
    request(`/assessments/${id}`, { method: "DELETE" }),
  addAssessmentRecording: (assessmentId: string, data: unknown) =>
    request(`/assessments/${assessmentId}/recordings`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  generateSpotCheck: (count?: number) =>
    request("/assessments/generate/spot-check", {
      method: "POST",
      body: JSON.stringify({ count }),
    }),
  generateWeeklyReview: () =>
    request("/assessments/generate/weekly-review", { method: "POST" }),
  getAuditComparison: (pieceId: string) =>
    request<unknown[]>(`/assessments/compare/${pieceId}`),

  // Composition / Exercise Generation
  generateRule: (type: string, params: unknown) =>
    request("/composition/generate/rule", {
      method: "POST",
      body: JSON.stringify({ type, params }),
    }),
  generateFromDemand: (demandId: string) =>
    request("/composition/generate/from-demand", {
      method: "POST",
      body: JSON.stringify({ demand_id: demandId }),
    }),
  generateAi: (
    type: string,
    prompt: string,
    context?: unknown,
    confirmed?: boolean,
  ) =>
    request("/composition/generate/ai", {
      method: "POST",
      body: JSON.stringify({ type, prompt, context, confirmed }),
    }),
  saveGeneratedExercise: (data: unknown) =>
    request("/composition/generate/save", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  generateExcerptPrep: (excerptId: string, confirmed?: boolean) =>
    request("/composition/generate/excerpt-prep", {
      method: "POST",
      body: JSON.stringify({ excerpt_id: excerptId, confirmed }),
    }),
  generateWarmup: (sessionId?: string, confirmed?: boolean) =>
    request("/composition/generate/warmup", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, confirmed }),
    }),

  // Community
  followUser: (userId: string) =>
    request(`/community/follow/${userId}`, { method: "POST" }),
  unfollowUser: (userId: string) =>
    request(`/community/follow/${userId}`, { method: "DELETE" }),
  getFollowers: () => request<unknown[]>("/community/followers"),
  getFollowing: () => request<unknown[]>("/community/following"),
  getFeed: () => request<unknown[]>("/community/feed"),
  getDiscoverFeed: () => request<unknown[]>("/community/discover"),
  searchUsers: (q: string) =>
    request<unknown[]>(`/community/users/search?q=${encodeURIComponent(q)}`),
  getPublicProfile: (userId: string) => request(`/community/users/${userId}`),

  // Challenges
  createChallenge: (data: unknown) =>
    request("/challenges", { method: "POST", body: JSON.stringify(data) }),
  getChallenges: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<unknown[]>(`/challenges${qs}`);
  },
  getChallenge: (id: string) => request(`/challenges/${id}`),
  cancelChallenge: (id: string) =>
    request(`/challenges/${id}/cancel`, { method: "PUT" }),
  acceptChallenge: (id: string) =>
    request(`/challenges/${id}/accept`, { method: "PUT" }),
  declineChallenge: (id: string) =>
    request(`/challenges/${id}/decline`, { method: "PUT" }),
  submitChallenge: (
    id: string,
    data: { recording_id: string; score: number },
  ) =>
    request(`/challenges/${id}/submit`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  generateWeeklyChallenge: () =>
    request("/challenges/weekly/generate", { method: "POST" }),

  // Theme Gallery
  getThemeGallery: (sort?: string) =>
    request<unknown[]>(`/theme-gallery${sort ? `?sort=${sort}` : ""}`),
  getTheme: (id: string) => request(`/theme-gallery/${id}`),
  createTheme: (data: {
    name: string;
    description?: string;
    base_theme?: string;
    tokens: Record<string, string>;
    tags?: string[];
  }) =>
    request("/theme-gallery", { method: "POST", body: JSON.stringify(data) }),
  updateTheme: (id: string, data: unknown) =>
    request(`/theme-gallery/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteTheme: (id: string) =>
    request(`/theme-gallery/${id}`, { method: "DELETE" }),
  toggleThemeFavorite: (id: string) =>
    request(`/theme-gallery/${id}/favorite`, { method: "POST" }),
  downloadTheme: (id: string) =>
    request(`/theme-gallery/${id}/download`, { method: "POST" }),

  // Community Excerpts
  getCommunityExcerpts: () => request<unknown[]>("/community-excerpts"),
  getExcerptCommunity: (excerptId: string) =>
    request(`/community-excerpts/${excerptId}/community`),
  rateExcerpt: (excerptId: string, difficulty_rating: number) =>
    request(`/community-excerpts/${excerptId}/rate`, {
      method: "POST",
      body: JSON.stringify({ difficulty_rating }),
    }),
  addExcerptNote: (excerptId: string, note: string) =>
    request(`/community-excerpts/${excerptId}/notes`, {
      method: "POST",
      body: JSON.stringify({ note }),
    }),
  deleteExcerptNote: (noteId: string) =>
    request(`/community-excerpts/notes/${noteId}`, { method: "DELETE" }),
  upvoteExcerptNote: (noteId: string) =>
    request(`/community-excerpts/notes/${noteId}/upvote`, { method: "POST" }),

  // Auditions
  getAuditions: () => request<import("../core/types").Audition[]>("/auditions"),
  getUpcomingAuditions: () =>
    request<import("../core/types").UpcomingAuditions>("/auditions/upcoming"),
  createAudition: (data: {
    title: string;
    audition_date: string;
    notes?: string;
    repertoire?: unknown[];
  }) =>
    request<import("../core/types").Audition>("/auditions", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateAudition: (id: string, data: unknown) =>
    request<import("../core/types").Audition>(`/auditions/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteAudition: (id: string) =>
    request(`/auditions/${id}`, { method: "DELETE" }),

  // Billing
  getSubscription: () =>
    request<import("../core/types").SubscriptionInfo>("/billing/subscription"),
  getUsage: () => request("/billing/usage"),
  getTiers: () =>
    request<{ tiers: import("../core/types").TierDefinition[] }>(
      "/billing/tiers",
    ),
  createCheckout: (tier: string, interval: "monthly" | "annual" = "monthly") =>
    request<{ url: string }>("/billing/create-checkout-session", {
      method: "POST",
      body: JSON.stringify({ tier, interval }),
    }),
  createPortal: () =>
    request<{ url: string }>("/billing/create-portal-session", {
      method: "POST",
    }),
  joinWaitlist: (email: string, studio_size?: number) =>
    request<{ id?: string; already_registered?: boolean; message: string }>(
      "/billing/waitlist",
      {
        method: "POST",
        body: JSON.stringify({ email, studio_size }),
      },
    ),
};
