const API_BASE = import.meta.env.VITE_API_URL

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const contentType = res.headers.get('content-type') || ''
  if (!res.ok || !contentType.includes('application/json')) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Сервер недоступен')
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export type Worker = { name: string; gender: 'м' | 'ж' }

export type Employee = {
  id: string
  full_name: string
  organization: string
  access_date: string
  record_type: 'person' | 'vehicle'
  vehicle_type: string | null
  created_at?: string
}

export type Meme = {
  id: string
  description: string
  image_url: string | null
  created_at?: string
}

export type TeamStatsRow = {
  worker_name: string
  weight: number
  happiness: number
  balance: number
  title_level: number
  title_xp: number
}

export type ChatMessage = {
  id: string
  user_id: string
  nickname: string
  message: string
  chat_day: string
  created_at: string
}

export type PredictionCount = { name: string; count: number }

export type VoteChoices = { choice_1: string; choice_2: string; choice_3: string }

export type TestQuestionRow = {
  question_id: string
  question_text: string
  options: string[]
  correct_answer: number | null
  block_number?: number | null
}

export type TestBlockAssignment = {
  question_id: string
  block_number: number
  updated_at: string
}

export type KnowledgeNumber = {
  number: number
  content: string
  updated_at: string
}

export type MiniGameProfile = {
  user_id: string
  level: number
  xp: number
  currentXp: number
  neededXp: number
  coins: number
  title: string
  titleLevel: number
  titleXp: number
  titleCurrentXp: number
  titleNeededXp: number
}

export type MiniGameProgress = {
  game_number: number
  completed: boolean
  best_score: number
  played_at: string
}

export type MiniGameData = {
  profile: MiniGameProfile
  progress: MiniGameProgress[]
}

export type DailyPollCandidate = {
  candidate: string
  votes: number
  placement: number
}

export type DailyPollToday = {
  pollId: number
  question: string
  userVote: string[] | null
  votedAt: string | null
}

export type DailyPollYesterday = {
  pollId: number
  question: string
  results: DailyPollCandidate[]
  userVote: string[] | null
  reward: { participation_rewarded: boolean; result_rewarded: boolean; xp_awarded: number; title_xp_awarded: number } | null
}

export type DailyPollState = {
  today: DailyPollToday
  yesterday: DailyPollYesterday | null
}

export type DailyPollResultBreakdown = {
  candidate: string
  placement: number
  xp: number
  titleXp: number
}

export type DailyPollClaimResult = {
  success: boolean
  message?: string
  totalXp: number
  totalTitleXp: number
  breakdown?: DailyPollResultBreakdown[]
  results?: DailyPollCandidate[]
  alreadyClaimed?: boolean
}

// ─── Mini-games #2-6 shared types ───

export type GameState = {
  today: {
    question: string
    [key: string]: unknown
  }
  yesterday: {
    question: string
    [key: string]: unknown
  } | null
}

export type GameVoteResult = {
  success: boolean
  message: string
  profile?: MiniGameProfile
  isCorrect?: boolean
  correctIndex?: number
  isMafia?: boolean
  attemptNumber?: number
  goldReward?: { titleXp: number; coins: number } | null
  silverReward?: { titleXp: number; coins: number } | null
}

export type GameClaimResult = {
  success: boolean
  message?: string
  totalTitleXp?: number
  totalCoins?: number
  winner?: string | number | null
  alreadyClaimed?: boolean
  profile?: MiniGameProfile
}

export const api = {
  // Employees
  getEmployees: () => apiFetch<Employee[]>('/api/employees'),
  addEmployee: (data: Omit<Employee, 'id' | 'created_at'>) =>
    apiFetch<Employee>('/api/employees', { method: 'POST', body: JSON.stringify(data) }),
  deleteEmployee: (id: string) =>
    apiFetch<void>(`/api/employees/${id}`, { method: 'DELETE' }),

  // Workers
  getWorkers: () => apiFetch<Worker[]>('/api/workers'),
  addWorker: (name: string, gender: string) =>
    apiFetch<Worker>('/api/workers', { method: 'POST', body: JSON.stringify({ name, gender }) }),
  removeWorker: (name: string) =>
    apiFetch<void>(`/api/workers/${encodeURIComponent(name)}`, { method: 'DELETE' }),

  // Team stats
  getTeamStats: () => apiFetch<TeamStatsRow[]>('/api/team-stats'),
  adjustTeamStats: (worker_name: string, weight: number, happiness: number, balance: number) =>
    apiFetch<TeamStatsRow>('/api/team-stats/adjust', {
      method: 'POST',
      body: JSON.stringify({ worker_name, weight, happiness, balance }),
    }),
  updateTitle: (workerName: string, title_level: number, title_xp: number) =>
    apiFetch<TeamStatsRow>(`/api/team-stats/${encodeURIComponent(workerName)}/title`, {
      method: 'PATCH',
      body: JSON.stringify({ title_level, title_xp }),
    }),

  // Memes
  getMemes: () => apiFetch<Meme[]>('/api/memes'),
  addMeme: (description: string, image_url: string | null) =>
    apiFetch<Meme>('/api/memes', { method: 'POST', body: JSON.stringify({ description, image_url }) }),

  // Prediction counts
  getPredictionCounts: () => apiFetch<PredictionCount[]>('/api/prediction-counts'),
  incrementPredictionCount: (name: string) =>
    apiFetch<PredictionCount>('/api/prediction-counts/increment', { method: 'POST', body: JSON.stringify({ name }) }),

  // Secret attempts
  getSecretAttempts: () => apiFetch<{ attempts: number }>('/api/secret-attempts'),
  incrementSecretAttempts: () =>
    apiFetch<{ attempts: number }>('/api/secret-attempts/increment', { method: 'POST' }),

  // Chat
  getMyNick: (deviceId: string, day: string) =>
    apiFetch<{ nickname: string | null }>(`/api/chat/nicks/${deviceId}?day=${day}`),
  getTakenNicks: (day: string) =>
    apiFetch<string[]>(`/api/chat/nicks?day=${day}`),
  assignNick: (user_id: string, nickname: string, chat_day: string) =>
    apiFetch<{ user_id: string; nickname: string; chat_day: string }>('/api/chat/nicks', {
      method: 'POST',
      body: JSON.stringify({ user_id, nickname, chat_day }),
    }),
  getMessages: (day: string) =>
    apiFetch<ChatMessage[]>(`/api/chat/messages?day=${day}`),
  sendMessage: (user_id: string, nickname: string, message: string, chat_day: string) =>
    apiFetch<ChatMessage>('/api/chat/messages', {
      method: 'POST',
      body: JSON.stringify({ user_id, nickname, message, chat_day }),
    }),
  getMessageCount: (day: string) =>
    apiFetch<{ count: number }>(`/api/chat/messages/count?day=${day}`),

  // Votes
  getVote: (gameDay: string, voterName: string) =>
    apiFetch<VoteChoices | null>(`/api/votes?gameDay=${encodeURIComponent(gameDay)}&voterName=${encodeURIComponent(voterName)}`),
  submitVote: (game_day: string, voter_name: string, question: string, choices: string[]) =>
    apiFetch<VoteChoices & { game_day: string; voter_name: string; question: string }>('/api/votes', {
      method: 'POST',
      body: JSON.stringify({
        game_day,
        voter_name,
        question,
        choice_1: choices[0],
        choice_2: choices[1],
        choice_3: choices[2],
      }),
    }),

  // Test questions
  getTestQuestions: () => apiFetch<TestQuestionRow[]>('/api/test-questions'),
  getActiveTestQuestions: () => apiFetch<TestQuestionRow[]>('/api/test-questions/active'),
  seedTestQuestions: async (questions: { question_id: string; question_text: string; options: string[] }[]) => {
    const BATCH_SIZE = 50
    let totalInserted = 0
    let totalUpdated = 0
    for (let i = 0; i < questions.length; i += BATCH_SIZE) {
      const batch = questions.slice(i, i + BATCH_SIZE)
      const result = await apiFetch<{ inserted: number; updated: number; total: number }>('/api/test-questions/seed', {
        method: 'POST',
        body: JSON.stringify({ questions: batch }),
      })
      totalInserted += result.inserted
      totalUpdated += result.updated
    }
    return { inserted: totalInserted, updated: totalUpdated, total: questions.length }
  },
  setCorrectAnswer: (questionId: string, correct_answer: number) =>
    apiFetch<TestQuestionRow>(`/api/test-questions/${encodeURIComponent(questionId)}/correct`, {
      method: 'PATCH',
      body: JSON.stringify({ correct_answer }),
    }),

  // Test question block assignments (served by Supabase Edge Function)
  getTestBlockAssignments: async (): Promise<TestBlockAssignment[]> => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-blocks`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
    })
    const contentType = res.headers.get('content-type') || ''
    if (!res.ok || !contentType.includes('application/json')) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || 'Сервер недоступен')
    }
    return res.json()
  },
  setTestBlockAssignment: async (questionId: string, blockNumber: number | null, password: string): Promise<{ question_id: string; block_number: number | null }> => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-blocks`
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ question_id: questionId, block_number: blockNumber, password }),
    })
    const contentType = res.headers.get('content-type') || ''
    const body = await res.json().catch(() => ({}))
    if (!res.ok || !contentType.includes('application/json')) {
      throw new Error(body.error || 'Сервер недоступен')
    }
    return body as { question_id: string; block_number: number | null }
  },

  // Knowledge numbers (served by Supabase Edge Function)
  getKnowledgeNumbers: async (): Promise<KnowledgeNumber[]> => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/knowledge-numbers`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
    })
    const contentType = res.headers.get('content-type') || ''
    if (!res.ok || !contentType.includes('application/json')) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || 'Сервер недоступен')
    }
    return res.json()
  },
  updateKnowledgeNumber: async (number: number, content: string, password: string): Promise<KnowledgeNumber> => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/knowledge-numbers`
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ number, content, password }),
    })
    const contentType = res.headers.get('content-type') || ''
    const body = await res.json().catch(() => ({}))
    if (!res.ok || !contentType.includes('application/json')) {
      throw new Error(body.error || 'Сервер недоступен')
    }
    return body as KnowledgeNumber
  },

  // Mini-games (served by Supabase Edge Function)
  getMiniGameData: async (userId: string): Promise<MiniGameData> => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mini-games?userId=${encodeURIComponent(userId)}`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
    })
    const contentType = res.headers.get('content-type') || ''
    if (!res.ok || !contentType.includes('application/json')) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || `API ${res.status}`)
    }
    return res.json()
  },
  addMiniGameRewards: async (userId: string, addXp: number, addCoins: number): Promise<MiniGameProfile> => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mini-games`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ userId, addXp, addCoins }),
    })
    const contentType = res.headers.get('content-type') || ''
    const body = await res.json().catch(() => ({}))
    if (!res.ok || !contentType.includes('application/json')) {
      throw new Error(body.error || 'Сервер недоступен')
    }
    return body.profile as MiniGameProfile
  },
  upsertMiniGameProgress: async (userId: string, gameNumber: number, completed: boolean, bestScore: number): Promise<MiniGameProgress> => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mini-games`
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ userId, gameNumber, completed, bestScore }),
    })
    const contentType = res.headers.get('content-type') || ''
    const body = await res.json().catch(() => ({}))
    if (!res.ok || !contentType.includes('application/json')) {
      throw new Error(body.error || 'Сервер недоступен')
    }
    return body as MiniGameProgress
  },

  // Daily poll (mini-game #1)
  getDailyPollState: async (userId: string): Promise<DailyPollState> => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/daily-poll?userId=${encodeURIComponent(userId)}`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
    })
    const contentType = res.headers.get('content-type') || ''
    if (!res.ok || !contentType.includes('application/json')) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || 'Сервер недоступен')
    }
    return res.json()
  },
  voteDailyPoll: async (userId: string, selectedCandidates: string[]): Promise<{ success: boolean; message: string }> => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/daily-poll`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ userId, action: 'vote', selectedCandidates }),
    })
    const contentType = res.headers.get('content-type') || ''
    const body = await res.json().catch(() => ({}))
    if (!res.ok || !contentType.includes('application/json')) {
      throw new Error(body.error || 'Сервер недоступен')
    }
    return body as { success: boolean; message: string }
  },
  claimDailyPollResults: async (userId: string): Promise<DailyPollClaimResult> => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/daily-poll`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ userId, action: 'claimResults' }),
    })
    const contentType = res.headers.get('content-type') || ''
    const body = await res.json().catch(() => ({}))
    if (!res.ok || !contentType.includes('application/json')) {
      throw new Error(body.error || 'Сервер недоступен')
    }
    return body as DailyPollClaimResult
  },

  // Mini-games #2-6 (served by mini-games-2-6 edge function)
  getGameState: async (gameKey: string, userId: string): Promise<GameState> => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mini-games-2-6?gameKey=${encodeURIComponent(gameKey)}&userId=${encodeURIComponent(userId)}`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
    })
    const contentType = res.headers.get('content-type') || ''
    if (!res.ok || !contentType.includes('application/json')) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || 'Сервер недоступен')
    }
    return res.json()
  },
  submitGameVote: async (gameKey: string, userId: string, voteData: Record<string, unknown>): Promise<GameVoteResult> => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mini-games-2-6`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ gameKey, userId, action: 'vote', ...voteData }),
    })
    const contentType = res.headers.get('content-type') || ''
    const body = await res.json().catch(() => ({}))
    if (!res.ok || !contentType.includes('application/json')) {
      throw new Error(body.error || 'Сервер недоступен')
    }
    return body as GameVoteResult
  },
  claimGameResults: async (gameKey: string, userId: string): Promise<GameClaimResult> => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mini-games-2-6`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ gameKey, userId, action: 'claimResults' }),
    })
    const contentType = res.headers.get('content-type') || ''
    const body = await res.json().catch(() => ({}))
    if (!res.ok || !contentType.includes('application/json')) {
      throw new Error(body.error || 'Сервер недоступен')
    }
    return body as GameClaimResult
  },
}