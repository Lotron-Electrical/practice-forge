// Thin fetch wrapper — swap base URL for mobile

const BASE_URL = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers as Record<string, string> },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  // Settings
  getSettings: () => request<Record<string, unknown>>('/settings'),
  updateSetting: (key: string, value: unknown) =>
    request(`/settings/${key}`, { method: 'PUT', body: JSON.stringify({ value }) }),

  // Taxonomy
  getTaxonomy: () => request<unknown[]>('/taxonomy'),
  createCategory: (data: unknown) =>
    request('/taxonomy', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: string, data: unknown) =>
    request(`/taxonomy/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id: string) =>
    request(`/taxonomy/${id}`, { method: 'DELETE' }),

  // Pieces
  getPieces: () => request<unknown[]>('/pieces'),
  getPiece: (id: string) => request(`/pieces/${id}`),
  createPiece: (data: unknown) =>
    request('/pieces', { method: 'POST', body: JSON.stringify(data) }),
  updatePiece: (id: string, data: unknown) =>
    request(`/pieces/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePiece: (id: string) =>
    request(`/pieces/${id}`, { method: 'DELETE' }),

  // Sections
  createSection: (pieceId: string, data: unknown) =>
    request(`/pieces/${pieceId}/sections`, { method: 'POST', body: JSON.stringify(data) }),
  updateSection: (pieceId: string, sectionId: string, data: unknown) =>
    request(`/pieces/${pieceId}/sections/${sectionId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSection: (pieceId: string, sectionId: string) =>
    request(`/pieces/${pieceId}/sections/${sectionId}`, { method: 'DELETE' }),

  // Technical Demands
  createDemand: (pieceId: string, data: unknown) =>
    request(`/pieces/${pieceId}/demands`, { method: 'POST', body: JSON.stringify(data) }),
  updateDemand: (pieceId: string, demandId: string, data: unknown) =>
    request(`/pieces/${pieceId}/demands/${demandId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDemand: (pieceId: string, demandId: string) =>
    request(`/pieces/${pieceId}/demands/${demandId}`, { method: 'DELETE' }),
  linkExerciseToDemand: (pieceId: string, demandId: string, exerciseId: string) =>
    request(`/pieces/${pieceId}/demands/${demandId}/exercises`, { method: 'POST', body: JSON.stringify({ exercise_id: exerciseId }) }),
  unlinkExerciseFromDemand: (pieceId: string, demandId: string, exerciseId: string) =>
    request(`/pieces/${pieceId}/demands/${demandId}/exercises/${exerciseId}`, { method: 'DELETE' }),

  // Exercises
  getExercises: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<unknown[]>(`/exercises${qs}`);
  },
  getExercise: (id: string) => request(`/exercises/${id}`),
  createExercise: (data: unknown) =>
    request('/exercises', { method: 'POST', body: JSON.stringify(data) }),
  updateExercise: (id: string, data: unknown) =>
    request(`/exercises/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteExercise: (id: string) =>
    request(`/exercises/${id}`, { method: 'DELETE' }),

  // Excerpts
  getExcerpts: () => request<unknown[]>('/excerpts'),
  getExcerpt: (id: string) => request(`/excerpts/${id}`),
  createExcerpt: (data: unknown) =>
    request('/excerpts', { method: 'POST', body: JSON.stringify(data) }),
  updateExcerpt: (id: string, data: unknown) =>
    request(`/excerpts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteExcerpt: (id: string) =>
    request(`/excerpts/${id}`, { method: 'DELETE' }),

  // Sessions
  generateSession: (duration_min: number) =>
    request('/sessions/generate', { method: 'POST', body: JSON.stringify({ duration_min }) }),
  getCurrentSession: () => request('/sessions/current'),
  getSessions: () => request<unknown[]>('/sessions'),
  getSessionStats: () => request('/sessions/stats'),
  startSession: (id: string) =>
    request(`/sessions/${id}/start`, { method: 'PUT' }),
  completeBlock: (sessionId: string, blockId: string, data?: { actual_duration_min?: number; notes?: string }) =>
    request(`/sessions/${sessionId}/blocks/${blockId}/complete`, { method: 'PUT', body: JSON.stringify(data || {}) }),
  skipBlock: (sessionId: string, blockId: string) =>
    request(`/sessions/${sessionId}/blocks/${blockId}/skip`, { method: 'PUT' }),
  completeSession: (id: string, data?: { rating?: string; notes?: string }) =>
    request(`/sessions/${id}/complete`, { method: 'PUT', body: JSON.stringify(data || {}) }),
  getTodayRotation: () => request<unknown[]>('/sessions/rotation/today'),
  markRotationPracticed: (rotationId: string) =>
    request(`/sessions/rotation/${rotationId}/practiced`, { method: 'POST' }),
};
