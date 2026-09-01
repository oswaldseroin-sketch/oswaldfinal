import { whoOfThemQuestions } from './whoOfThemQuestions'

const API_BASE = import.meta.env.VITE_API_URL

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`
  let res: Response
  try {
    res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
  } catch (networkErr) {
    console.error('[API] Network error:', { url, error: networkErr })
    throw new Error('Сервер недоступен (нет соединения)')
  }

  const contentType = res.headers.get('content-type') || ''
  if (!res.ok || !contentType.includes('application/json')) {
    let body: Record<string, unknown> = {}
    try {
      body = await res.json()
    } catch {
      const text = await res.text().catch(() => '')
      console.error('[API] Non-JSON response:', { url, status: res.status, body: text.slice(0, 500) })
      throw new Error(`Сервер вернул не JSON (HTTP ${res.status})`)
    }
    const errMsg = (body.error as string) || `Ошибка сервера (HTTP ${res.status})`
    console.error('[API] Error response:', { url, status: res.status, body })
    throw new Error(errMsg)
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

export type PlayerRow = {
  id: number
  full_name: string
  gender: string
  coins: number
  xp: number
  level: number
  title_level: number
  title_xp: number
}

export type SecretRoomQuestion = {
  slot_number: number
  title: string
  correct_player_id: number | null
  correct_player_name: string | null
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

export type DailyPollClaimResult = {
  success: boolean
  message?: string
  totalXp: number
  totalTitleXp: number
  breakdown?: DailyPollResultBreakdown[]
  results?: DailyPollCandidate[]
  alreadyClaimed?: boolean
}

export type DailyPollResultBreakdown = {
  candidate: string
  placement: number
  xp: number
  titleXp: number
}

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
  totalXp?: number
  totalTitleXp?: number
  totalCoins?: number
  winner?: string | number | null
  alreadyClaimed?: boolean
  profile?: MiniGameProfile
}

// ─── Game key to URL path mapping ───
const GAME_PATHS: Record<string, string> = {
  who_of_them: 'who-of-them',
  would_he_do_it: 'would-he-do-it',
  past_life: 'past-life',
  best_duo: 'best-duo',
  rate_player: 'rate-player',
  mafia: 'mafia',
  yes_no: 'yes-no',
  secret_love: 'secret-love',
  roulette: 'roulette',
}

let _playersCache: PlayerRow[] | null = null

async function resolvePlayerId(name: string): Promise<string> {
  if (/^\d+$/.test(name)) return name
  if (!_playersCache) {
    _playersCache = await apiFetch<PlayerRow[]>('/api/players')
  }
  const match = _playersCache.find((p) => p.full_name === name)
  if (!match) throw new Error(`Игрок «${name}» не найден на сервере`)
  return String(match.id)
}

export const api = {
  // Employees
  getEmployees: () => apiFetch<Employee[]>('/api/employees'),
  addEmployee: (data: Omit<Employee, 'id' | 'created_at'>) =>
    apiFetch<Employee>('/api/employees', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployeeDate: (id: string, access_date: string) =>
  apiFetch<Employee>(`/api/employees/${id}/date`, {
    method: 'PATCH',
    body: JSON.stringify({ access_date }),
  }),
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
  // Secret room successful entries
  getSecretRoomEntries: () =>
    apiFetch<{ count: number }>('/api/secret-room/entries'),

  addSecretRoomEntry: async (userId: string) => {
    const playerId = await resolvePlayerId(userId)

    return apiFetch<{ ok: boolean; count: number }>('/api/secret-room/entries', {
      method: 'POST',
      body: JSON.stringify({ playerId }),
    })
  },
  // User secret rooms
getSecretUserRooms: () =>
  apiFetch<Array<{
    id: number
    slot_number: number
    room_name: string
    attempts: number
    entered: number
  }>>('/api/secret-user-rooms'),
getMySecretUserRoom: async (userId: string) => {
  const playerId = await resolvePlayerId(userId)

  return apiFetch<{
    hasRoom: boolean
    room: {
      id: number
      slot_number: number
      room_name: string
    } | null
  }>(`/api/secret-user-rooms/my/${playerId}`)
},
createSecretUserRoom: async (userId: string, roomName: string) => {
  const playerId = await resolvePlayerId(userId)

  return apiFetch<{
    id: number
    slot_number: number
    room_name: string
    attempts: number
    entered: number
  }>('/api/secret-user-rooms', {
    method: 'POST',
    body: JSON.stringify({
      playerId,
      roomName,
    }),
  })
},

saveSecretUserRoomQuestions: async (
  roomId: number,
  userId: string,
  questions: Array<{
    title: string
    correctAnswer: string
  }>,
) => {
  const playerId = await resolvePlayerId(userId)

  return apiFetch<{
    ok: boolean
    roomId: number
    saved: number
  }>(`/api/secret-user-rooms/${roomId}/questions`, {
    method: 'PUT',
    body: JSON.stringify({
      playerId,
      questions,
    }),
  })
},

getSecretUserRoomQuestions: (roomId: number) =>
  apiFetch<{
    roomId: number
    roomName: string
    questions: Array<{
      slot_number: number
      title: string
    }>
  }>(`/api/secret-user-rooms/${roomId}/questions`),

enterSecretUserRoom: async (
  roomId: number,
  userId: string,
  answers: string[],
) => {
  const playerId = await resolvePlayerId(userId)

  return apiFetch<{
    ok: boolean
    entered: boolean
    attempts: number
    enteredCount?: number
  }>(`/api/secret-user-rooms/${roomId}/enter`, {
    method: 'POST',
    body: JSON.stringify({
      playerId,
      answers,
    }),
  })
},
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

  // Test question block assignments (served by VPS API)
  getTestBlockAssignments: () => apiFetch<TestBlockAssignment[]>('/api/test-blocks'),
  setTestBlockAssignment: (questionId: string, blockNumber: number | null, password: string) =>
    apiFetch<{ question_id: string; block_number: number | null }>('/api/test-blocks', {
      method: 'PATCH',
      body: JSON.stringify({ question_id: questionId, block_number: blockNumber, password }),
    }),

    // Knowledge numbers (served by VPS API)
  getKnowledgeNumbers: () =>
    apiFetch<KnowledgeNumber[]>('/api/knowledge-numbers'),

  updateKnowledgeNumber: (number: number, content: string, password: string) =>
    apiFetch<KnowledgeNumber>('/api/knowledge-numbers', {
      method: 'PATCH',
      body: JSON.stringify({ number, content, password }),
    }),

  // Players (served by VPS API) — used to resolve worker name to numeric player ID
  getPlayers: () => apiFetch<PlayerRow[]>('/api/players'),

  // Secret room questions (served by VPS API)
  getSecretRoomQuestions: () => apiFetch<SecretRoomQuestion[]>('/api/secret-room/questions'),
  updateSecretRoomQuestion: (slotNumber: number, title: string, correctPlayerId: number) =>
    apiFetch<{ ok: boolean }>(`/api/secret-room/questions/${slotNumber}`, {
      method: 'PATCH',
      body: JSON.stringify({ title, correctPlayerId }),
    }),

  // Mini-games profile (served by VPS API)
  getMiniGameData: async (userId: string): Promise<MiniGameData> => {
    const numericId = await resolvePlayerId(userId)
    const result = await apiFetch<{ ok: boolean; profile: MiniGameProfile; progress: MiniGameProgress[] }>(
      `/api/mini-games/profile/${encodeURIComponent(numericId)}`
    )
    return { profile: result.profile, progress: result.progress }
  },
  addMiniGameRewards: async (userId: string, addXp: number, addCoins: number): Promise<MiniGameProfile> => {
    const numericId = await resolvePlayerId(userId)
    const result = await apiFetch<{ ok: boolean; player: MiniGameProfile }>(`/api/players/${encodeURIComponent(numericId)}/reward`, {
      method: 'POST',
      body: JSON.stringify({ addXp, addCoins }),
    })
    return result.player
  },
  upsertMiniGameProgress: async (_userId: string, _gameNumber: number, _completed: boolean, _bestScore: number): Promise<MiniGameProgress> => {
    // Progress is tracked server-side via daily_game_completions
    return { game_number: _gameNumber, completed: _completed, best_score: _bestScore, played_at: new Date().toISOString() }
  },

  // Daily poll (mini-game #1) — served by VPS API
  getDailyPollState: async (userId: string): Promise<DailyPollState> => {
    const numericId = await resolvePlayerId(userId)
    const result = await apiFetch<{ ok: boolean; today: DailyPollToday; yesterday: DailyPollYesterday | null }>(
      `/api/games/daily-poll/today?playerId=${encodeURIComponent(numericId)}`
    )
    return { today: result.today, yesterday: result.yesterday }
  },
  voteDailyPoll: async (userId: string, selectedCandidates: string[]): Promise<{ success: boolean; message: string }> => {
    const numericId = await resolvePlayerId(userId)
    const result = await apiFetch<{ ok: boolean; success: boolean; message: string }>(
      '/api/games/daily-poll/vote',
      { method: 'POST', body: JSON.stringify({ voterId: numericId, selectedCandidates }) }
    )
    return { success: result.success, message: result.message }
  },
  claimDailyPollResults: async (userId: string): Promise<DailyPollClaimResult> => {
    const numericId = await resolvePlayerId(userId)
    const result = await apiFetch<{ ok: boolean; success: boolean; totalXp: number; totalTitleXp: number; breakdown?: DailyPollResultBreakdown[]; alreadyClaimed?: boolean; message?: string }>(
      '/api/games/daily-poll/claim-results',
      { method: 'POST', body: JSON.stringify({ voterId: numericId }) }
    )
    return {
      success: result.success,
      message: result.message,
      totalXp: result.totalXp,
      totalTitleXp: result.totalTitleXp,
      breakdown: result.breakdown,
      alreadyClaimed: result.alreadyClaimed,
    }
  },

  // Mini-games #2-10 (served by VPS API)
  getGameState: async (gameKey: string, userId: string): Promise<GameState> => {
    const urlPath = GAME_PATHS[gameKey] || gameKey
    const numericId = await resolvePlayerId(userId)
    const result = await apiFetch<Record<string, unknown> & { ok?: boolean; today?: Record<string, unknown>; yesterday?: Record<string, unknown> | null }>(
      `/api/games/${urlPath}/today?playerId=${encodeURIComponent(numericId)}`
    )
    // who-of-them returns a flat response — wrap it into {today, yesterday}
    const today: Record<string, unknown> = {}
   if (gameKey === 'who_of_them') {
  today.question = (result.question as string) ?? ''
     today.player_1 = (result.player1 as { fullName?: string } | undefined)?.fullName ?? ''
today.player_2 = (result.player2 as { fullName?: string } | undefined)?.fullName ?? ''
    const status = await apiFetch<Record<string, unknown>>(
  `/api/games/who-of-them/status/${encodeURIComponent(numericId)}`
)

const chosenPlayerId = Number(status.chosenPlayerId)

today.userVote =
  chosenPlayerId === (result.player1 as { id?: number } | undefined)?.id
    ? (result.player1 as { fullName?: string } | undefined)?.fullName ?? null
    : chosenPlayerId === (result.player2 as { id?: number } | undefined)?.id
      ? (result.player2 as { fullName?: string } | undefined)?.fullName ?? null
      : null
      today.gameDay = result.gameDay ?? null
    } else if (result.today) {
      // Merge the server's today object with safe defaults for missing fields
      const serverToday = result.today as Record<string, unknown>
      today.question = serverToday.question ?? ''
      today.player_name = serverToday.player_name ?? ''
      today.players = serverToday.players ?? []
      today.userVote = serverToday.userVote ?? null
     today.selfQuestion = serverToday.selfQuestion ?? false
      today.attemptCount = serverToday.attemptCount ?? 0
      today.eliminated = serverToday.eliminated ?? []
      today.foundMafia = serverToday.foundMafia ?? false
      today.gameEnded = serverToday.gameEnded ?? false
      today.mafiaIndex = serverToday.mafiaIndex ?? null
      today.team1 = serverToday.team1 ?? []
      today.team2 = serverToday.team2 ?? []
      today.opponent_name = serverToday.opponent_name ?? ''
      today.result = serverToday.result ?? null
      today.correctIndex = serverToday.correctIndex ?? null
      today.isCorrect = serverToday.isCorrect ?? null
    } else {
      today.question = (result.question as string) ?? ''
      today.player_name = (result.player_name as string) ?? ''
      today.players = result.players ?? []
      today.userVote = result.userVote ?? null
      today.attemptCount = result.attemptCount ?? 0
      today.eliminated = result.eliminated ?? []
      today.foundMafia = result.foundMafia ?? false
      today.gameEnded = result.gameEnded ?? false
      today.mafiaIndex = result.mafiaIndex ?? null
      today.team1 = result.team1 ?? []
      today.team2 = result.team2 ?? []
      today.opponent_name = result.opponent_name ?? ''
      today.result = result.result ?? null
      today.correctIndex = result.correctIndex ?? null
      today.isCorrect = result.isCorrect ?? null
    }
    if (gameKey === 'who_of_them') {
 const yesterdayResult = await apiFetch<Record<string, unknown>>(
  `/api/games/who-of-them/yesterday-results?playerId=${encodeURIComponent(numericId)}`
)

  let yesterday: GameState['yesterday'] = null

  if (yesterdayResult.hasResults) {
    const qIdx =
      typeof yesterdayResult.questionIndex === 'number'
        ? yesterdayResult.questionIndex
        : 0

    const player1 = yesterdayResult.player1 as
      | { id?: number; fullName?: string; votes?: number }
      | undefined

    const player2 = yesterdayResult.player2 as
      | { id?: number; fullName?: string; votes?: number }
      | undefined

    const winnerPlayerId =
      typeof yesterdayResult.winnerPlayerId === 'number'
        ? yesterdayResult.winnerPlayerId
        : null

    const winner =
      winnerPlayerId === player1?.id
        ? player1?.fullName ?? null
        : winnerPlayerId === player2?.id
          ? player2?.fullName ?? null
          : null

    yesterday = {
      question:
        (whoOfThemQuestions[qIdx] as string) ||
        whoOfThemQuestions[0] ||
        '',
      player_1: player1?.fullName ?? '',
      player_2: player2?.fullName ?? '',
      votes: {
        [player1?.fullName ?? '']: player1?.votes ?? 0,
        [player2?.fullName ?? '']: player2?.votes ?? 0,
      },
      winner,
     userVote:
  typeof yesterdayResult.userVote === 'string'
    ? yesterdayResult.userVote
    : null,

reward:
  (yesterdayResult.reward as GameState['yesterday'] extends infer Y
    ? Y extends { reward: infer R }
      ? R
      : never
    : never) ?? null,
    }
  }

  return {
    today: today as GameState['today'],
    yesterday,
  }
}

return {
  today: today as GameState['today'],
  yesterday: (result.yesterday ?? null) as GameState['yesterday'],
}
  },
  submitGameVote: async (gameKey: string, userId: string, voteData: Record<string, unknown>): Promise<GameVoteResult> => {
    const urlPath = GAME_PATHS[gameKey] || gameKey
    const numericId = await resolvePlayerId(userId)
    const result = await apiFetch<{ ok: boolean; success: boolean; message: string; isCorrect?: boolean; correctIndex?: number; isMafia?: boolean; attemptNumber?: number; profile?: MiniGameProfile }>(
      `/api/games/${urlPath}/vote`,
      { method: 'POST', body: JSON.stringify({ voterId: numericId, ...voteData }) }
    )
    return {
      success: result.success,
      message: result.message ?? '',
      profile: result.profile,
      isCorrect: result.isCorrect,
      correctIndex: result.correctIndex,
      isMafia: result.isMafia,
      attemptNumber: result.attemptNumber,
    }
  },
  claimGameResults: async (gameKey: string, userId: string): Promise<GameClaimResult> => {
    const urlPath = GAME_PATHS[gameKey] || gameKey
    const numericId = await resolvePlayerId(userId)
const result = await apiFetch<{
  ok: boolean
  success?: boolean
  totalXp?: number
  totalTitleXp?: number
  totalCoins?: number
  winner?: string | number | null
  alreadyClaimed?: boolean
  message?: string
}>(
  gameKey === 'who_of_them' || gameKey === 'rate_player'
    ? `/api/games/${urlPath}/claim-yesterday`
    : `/api/games/${urlPath}/claim-results`,
  {
    method: 'POST',
    body: JSON.stringify({ voterId: numericId }),
  },
)
   return {
  success: result.success ?? result.ok,
  message: result.message,
  totalXp: result.totalXp,
  totalTitleXp: result.totalTitleXp,
  totalCoins: result.totalCoins,
  winner: result.winner,
  alreadyClaimed: result.alreadyClaimed,
}
  },
}
