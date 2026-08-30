import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ─── Russia timezone (UTC+3) — game day boundary at 08:00 MSK ───
function getRussiaDate(date: Date = new Date()): string {
  const russiaTime = new Date(date.getTime() + (3 * 60 * 60 * 1000));
  // Subtract 8 hours so the day flips at 08:00 MSK instead of 00:00 MSK
  const adjusted = new Date(russiaTime.getTime() - (8 * 60 * 60 * 1000));
  return adjusted.toISOString().slice(0, 10);
}

function getYesterdayRussiaDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getRussiaDate(d);
}

// ─── Seeded random for deterministic daily question/player selection ───
function seededRandom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h) + seed.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function pickIndex(seed: string, count: number): number {
  if (count <= 0) return 0;
  return seededRandom(seed) % count;
}

function pickNPlayers(seed: string, workers: string[], n: number): string[] {
  const pool = [...workers];
  const result: string[] = [];
  let s = seed;
  for (let i = 0; i < n && pool.length > 0; i++) {
    s = `${seed}:pick${i}`;
    const idx = seededRandom(s) % pool.length;
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}

// ─── Ordinary XP system (20 XP per level) ───
function recalcOrdinaryLevel(xp: number): { level: number; remainder: number } {
  let level = 1;
  let remaining = xp;
  while (remaining >= 20) {
    remaining -= 20;
    level++;
  }
  return { level, remainder: remaining };
}

// ─── Title XP system (tiered requirements, max 50) ───
const TITLE_TITLES: string[] = [
  "Силиконовый ослик", "Нюхач куртки Семяшкина", "Кривошляпа из Забугоровки",
  "Экзорцист туалетных кабин", "Министр бумажной духоты", "Дилер семечек",
  "Спонсор депрессии", "Экстремальный потребитель тормозков", "Кибер-пельмень в тумане",
  "Жертва медального танца", "Облизыватель журнала сдачи", "Бреющий во сне",
  "Диванный самурай Амальгамы", "Коллекционер использованных ручек", "Мастер интриг на КПП",
  "Повелитель сыворотки правды", "Святой отец кнопочных телефонов", "Энергетический вампир на чилле",
  "Душитель подушек", "Архангел КПП", "Король-Призрак", "Бессмертный Всадник",
  "Несущий Истину", "Великий Инквизитор", "Магистр Ордена",
  // 26-50: extended titles
  "Хранитель Тайного Знания", "Архивариус Забытых Лет", "Страж Порога",
  "Глашатай Рассвета", "Зверолов Сновидений", "Кузнец Судеб",
  "Проводник Восьмого Пути", "Чтец Пустых Строк", "Великий Молчальник",
  "Ткач Несказанного", "Око Бесконечности", "Хранитель Равновесия",
  "Архитектор Тишины", "Наследник Пепла", "Властелин Осколков",
  "Строитель Мостов", "Хранитель Времени", "Мастер Отражений",
  "Капитан Забвения", "Странник Края", "Хранитель Источника",
  "Грандмейстер Амальгамы", "Абсолютный Магистр", "Вечный Страж",
  "Легенда Амальгамы",
];
const MAX_TITLE_LEVEL = 50;

function titleXpForLevel(level: number): number {
  if (level >= 1 && level <= 5) return 20;
  if (level >= 6 && level <= 10) return 30;
  if (level >= 11 && level <= 20) return 40;
  if (level >= 21 && level <= 30) return 50;
  if (level >= 31 && level <= 40) return 65;
  if (level >= 41 && level <= 45) return 80;
  if (level >= 46 && level <= 49) return 100;
  return 0; // level 50 = MAX
}

function recalcTitleLevel(titleXp: number): { level: number; currentXp: number; neededXp: number; title: string } {
  let level = 1;
  let remaining = titleXp;
  while (level < MAX_TITLE_LEVEL) {
    const needed = titleXpForLevel(level);
    if (needed > 0 && remaining >= needed) {
      remaining -= needed;
      level++;
    } else {
      break;
    }
  }
  const needed = titleXpForLevel(level);
  const title = level >= MAX_TITLE_LEVEL
    ? TITLE_TITLES[MAX_TITLE_LEVEL - 1]
    : (TITLE_TITLES[level - 1] || TITLE_TITLES[0]);
  return {
    level,
    currentXp: level >= MAX_TITLE_LEVEL ? 0 : remaining,
    neededXp: level >= MAX_TITLE_LEVEL ? 0 : needed,
    title,
  };
}

// ─── Game keys ───
const GAME_KEYS: Record<number, string> = {
  2: "who_of_them",
  3: "would_he_do_it",
  4: "past_life",
  5: "best_duo",
  6: "rate_player",
  7: "mafia",
  8: "yes_no",
  9: "secret_love",
  10: "roulette",
};

const GAME_NUMBER_FROM_KEY: Record<string, number> = Object.fromEntries(
  Object.entries(GAME_KEYS).map(([k, v]) => [v, Number(k)])
);

// ─── Test questions (to be replaced with full lists later) ───
const QUESTIONS: Record<string, string[]> = {
  who_of_them: ["Кто выживет 10 дней в лесу без еды?"],
  would_he_do_it: ["Сделал бы это за 100 000 рублей?"],
  past_life: ["Кто в прошлой жизни был рваным сапогом?"],
  best_duo: ["Кто из них лучше отработает смену вместе?"],
  rate_player: ["Оцени дружелюбие этого человека"],
  yes_no: ["Смог бы ты выгулять его собаку просто так?"],
};

// ─── Base reward: +2 ordinary XP, +1 coin ───
const BASE_XP = 2;
const BASE_COINS = 1;

// ─── Result rewards ───
const RESULT_REWARDS = {
  bronze: { titleXp: 1, coins: 1 }, // 🥉
  silver: { titleXp: 2, coins: 2 }, // 🥈
  gold: { titleXp: 3, coins: 3 },   // 🥇
};

// ─── 10/10 bonus ───
const ALL_GAMES_BONUS_TITLE_XP = 5;
const ALL_GAME_KEYS = [
  "daily_poll", // game #1
  "who_of_them", // game #2
  "would_he_do_it", // game #3
  "past_life", // game #4
  "best_duo", // game #5
  "rate_player", // game #6
  "mafia", // game #7
  "yes_no", // game #8
  "secret_love", // game #9
  "roulette", // game #10
];

// ─── Helpers ───
type SupabaseClient = ReturnType<typeof createClient>;

async function getOrCreateProfile(supabase: SupabaseClient, userId: string) {
  let { data: profile } = await supabase
    .from("mini_game_profile")
    .select("user_id, level, xp, coins, title, title_xp, title_level, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (!profile) {
    const { data: newProfile } = await supabase
      .from("mini_game_profile")
      .insert({ user_id: userId, level: 1, xp: 0, coins: 0, title: TITLE_TITLES[0], title_xp: 0, title_level: 1 })
      .select("user_id, level, xp, coins, title, title_xp, title_level, updated_at")
      .single();
    profile = newProfile;
  }
  return profile;
}

async function recordCompletion(supabase: SupabaseClient, userId: string, gameKey: string, gameDay: string): Promise<void> {
  // Insert with ON CONFLICT DO NOTHING semantics via maybeSingle check
  const { data: existing } = await supabase
    .from("daily_game_completions")
    .select("id")
    .eq("user_id", userId)
    .eq("game_key", gameKey)
    .eq("game_day", gameDay)
    .maybeSingle();

  if (!existing) {
    await supabase
      .from("daily_game_completions")
      .insert({ user_id: userId, game_key: gameKey, game_day: gameDay });
  }
}

async function checkAndGrantAllGamesBonus(supabase: SupabaseClient, userId: string, gameDay: string): Promise<{ granted: boolean; titleXpAwarded: number }> {
  // Check if already rewarded
  const { data: existingReward } = await supabase
    .from("daily_game_set_rewards")
    .select("id, bonus_rewarded, title_xp_awarded")
    .eq("user_id", userId)
    .eq("game_day", gameDay)
    .maybeSingle();

  if (existingReward?.bonus_rewarded) {
    return { granted: false, titleXpAwarded: 0 };
  }

  // Count completed games today
  const { data: completions } = await supabase
    .from("daily_game_completions")
    .select("game_key")
    .eq("user_id", userId)
    .eq("game_day", gameDay);

  const completedKeys = new Set((completions || []).map((c: { game_key: string }) => c.game_key));
  const allDone = ALL_GAME_KEYS.every((k) => completedKeys.has(k));

  if (!allDone) {
    return { granted: false, titleXpAwarded: 0 };
  }

  // Grant bonus
  if (existingReward) {
    await supabase
      .from("daily_game_set_rewards")
      .update({ bonus_rewarded: true, title_xp_awarded: ALL_GAMES_BONUS_TITLE_XP })
      .eq("id", existingReward.id);
  } else {
    await supabase
      .from("daily_game_set_rewards")
      .insert({ user_id: userId, game_day: gameDay, bonus_rewarded: true, title_xp_awarded: ALL_GAMES_BONUS_TITLE_XP });
  }

  // Add title XP
  await addTitleXp(supabase, userId, ALL_GAMES_BONUS_TITLE_XP, "all_games_bonus", null, gameDay);

  return { granted: true, titleXpAwarded: ALL_GAMES_BONUS_TITLE_XP };
}

async function addOrdinaryXp(supabase: SupabaseClient, userId: string, amount: number, reason: string, gameKey: string | null, gameDay: string): Promise<void> {
  const profile = await getOrCreateProfile(supabase, userId);
  if (!profile) return;
  const newXp = profile.xp + amount;
  const { level } = recalcOrdinaryLevel(newXp);
  await supabase
    .from("mini_game_profile")
    .update({ xp: newXp, level, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  await supabase
    .from("xp_transactions")
    .insert({ user_id: userId, amount, reason, game_key: gameKey, game_day: gameDay });
}

async function addCoins(supabase: SupabaseClient, userId: string, amount: number, reason: string, gameKey: string | null, gameDay: string): Promise<void> {
  const profile = await getOrCreateProfile(supabase, userId);
  if (!profile) return;
  const newCoins = profile.coins + amount;
  await supabase
    .from("mini_game_profile")
    .update({ coins: newCoins, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  await supabase
    .from("coin_transactions")
    .insert({ user_id: userId, amount, reason, game_key: gameKey, game_day: gameDay });
}

async function addTitleXp(supabase: SupabaseClient, userId: string, amount: number, reason: string, gameKey: string | null, gameDay: string): Promise<{ newLevel: number; leveledUp: boolean }> {
  const profile = await getOrCreateProfile(supabase, userId);
  if (!profile) return { newLevel: 1, leveledUp: false };

  const currentTitleXp = profile.title_xp || 0;
  const currentTitleLevel = profile.title_level || 1;
  const newTitleXp = currentTitleXp + amount;
  const { level: newTitleLevel, title: newTitle } = recalcTitleLevel(newTitleXp);

  await supabase
    .from("mini_game_profile")
    .update({ title_xp: newTitleXp, title_level: newTitleLevel, title: newTitle, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  // Record title XP in xp_transactions with reason prefix
  await supabase
    .from("xp_transactions")
    .insert({ user_id: userId, amount, reason: `title_${reason}`, game_key: gameKey, game_day: gameDay });

  return { newLevel: newTitleLevel, leveledUp: newTitleLevel > currentTitleLevel };
}

async function getOrCreateRewardRow(
  supabase: SupabaseClient,
  table: string,
  gameDay: string,
  userId: string
): Promise<{ id: string; participation_rewarded: boolean; result_rewarded: boolean; xp_awarded: number; title_xp_awarded: number; coins_awarded: number }> {
  let { data: existing } = await supabase
    .from(table)
    .select("id, participation_rewarded, result_rewarded, xp_awarded, title_xp_awarded, coins_awarded")
    .eq("game_day", gameDay)
    .eq("user_id", userId)
    .maybeSingle();

  if (!existing) {
    const { data: newRow } = await supabase
      .from(table)
      .insert({ game_day: gameDay, user_id: userId })
      .select("id, participation_rewarded, result_rewarded, xp_awarded, title_xp_awarded, coins_awarded")
      .single();
    existing = newRow;
  }
  return existing as { id: string; participation_rewarded: boolean; result_rewarded: boolean; xp_awarded: number; title_xp_awarded: number; coins_awarded: number };
}

// ─── Grant base participation reward atomically ───
async function grantBaseReward(
  supabase: SupabaseClient,
  userId: string,
  gameKey: string,
  gameNumber: number,
  gameDay: string,
  rewardTable: string
): Promise<{ alreadyAwarded: boolean; profile: any; titleLeveledUp: boolean; newTitleLevel: number }> {
  const reward = await getOrCreateRewardRow(supabase, rewardTable, gameDay, userId);

  if (reward.participation_rewarded) {
    const profile = await getOrCreateProfile(supabase, userId);
    return { alreadyAwarded: true, profile, titleLeveledUp: false, newTitleLevel: profile?.title_level || 1 };
  }

  // Mark participation rewarded
  await supabase
    .from(rewardTable)
    .update({
      participation_rewarded: true,
      xp_awarded: (reward.xp_awarded || 0) + BASE_XP,
      coins_awarded: (reward.coins_awarded || 0) + BASE_COINS,
    })
    .eq("id", reward.id);

  // Award XP + coins
  await addOrdinaryXp(supabase, userId, BASE_XP, `${gameKey}_vote`, gameKey, gameDay);
  await addCoins(supabase, userId, BASE_COINS, `${gameKey}_vote`, gameKey, gameDay);

  // Record completion
  await recordCompletion(supabase, userId, gameKey, gameDay);

  // Check 10/10 bonus
  const bonusResult = await checkAndGrantAllGamesBonus(supabase, userId, gameDay);
  let titleLeveledUp = false;
  let newTitleLevel = 0;
  if (bonusResult.granted) {
    const titleResult = await addTitleXp(supabase, userId, 0, "bonus_check", gameKey, gameDay);
    titleLeveledUp = titleResult.leveledUp;
    newTitleLevel = titleResult.newLevel;
  }

  const profile = await getOrCreateProfile(supabase, userId);
  return { alreadyAwarded: false, profile, titleLeveledUp, newTitleLevel: profile?.title_level || 1 };
}

// ─── Grant result reward (next day, idempotent) ───
async function grantResultReward(
  supabase: SupabaseClient,
  userId: string,
  gameKey: string,
  gameDay: string,
  rewardTable: string,
  tier: "bronze" | "silver" | "gold"
): Promise<{ alreadyAwarded: boolean; titleXp: number; coins: number; titleLeveledUp: boolean; newTitleLevel: number }> {
  const reward = await getOrCreateRewardRow(supabase, rewardTable, gameDay, userId);

  if (reward.result_rewarded) {
    return { alreadyAwarded: true, titleXp: 0, coins: 0, titleLeveledUp: false, newTitleLevel: 0 };
  }

  const { titleXp, coins } = RESULT_REWARDS[tier];

  await supabase
    .from(rewardTable)
    .update({
      result_rewarded: true,
      title_xp_awarded: (reward.title_xp_awarded || 0) + titleXp,
      coins_awarded: (reward.coins_awarded || 0) + coins,
    })
    .eq("id", reward.id);

  await addTitleXp(supabase, userId, titleXp, `${gameKey}_result`, gameKey, gameDay);
  await addCoins(supabase, userId, coins, `${gameKey}_result`, gameKey, gameDay);

  const profile = await getOrCreateProfile(supabase, userId);
  return {
    alreadyAwarded: false,
    titleXp,
    coins,
    titleLeveledUp: false,
    newTitleLevel: profile?.title_level || 1,
  };
}

// ─── Build profile response ───
function buildProfileResponse(profile: any) {
  const { level: ordLevel, remainder: ordRemainder } = recalcOrdinaryLevel(profile.xp);
  const titleInfo = recalcTitleLevel(profile.title_xp || 0);
  return {
    user_id: profile.user_id,
    level: ordLevel,
    xp: profile.xp,
    currentXp: ordRemainder,
    neededXp: 20,
    coins: profile.coins,
    title: titleInfo.title,
    titleLevel: titleInfo.level,
    titleXp: profile.title_xp || 0,
    titleCurrentXp: titleInfo.currentXp,
    titleNeededXp: titleInfo.neededXp,
  };
}

// ─── Fetch workers from game_workers table ───
async function getWorkers(supabase: SupabaseClient): Promise<string[]> {
  const { data } = await supabase
    .from("game_workers")
    .select("name")
    .order("name", { ascending: true });
  return (data || []).map((w: { name: string }) => w.name);
}

// ─── MAIN HANDLER ───
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const url = new URL(req.url);
    const method = req.method;

    // ─── GET: get game state ───
    if (method === "GET") {
      const gameKey = url.searchParams.get("gameKey");
      const userId = url.searchParams.get("userId");
      if (!gameKey || !userId) {
        return json({ error: "gameKey and userId required" }, 400);
      }

      const todayStr = getRussiaDate();
      const yesterdayStr = getYesterdayRussiaDate();

      if (gameKey === "who_of_them") {
        return await handleWhoOfThemGet(supabase, userId, todayStr, yesterdayStr);
      } else if (gameKey === "would_he_do_it") {
        return await handleWouldHeDoItGet(supabase, userId, todayStr, yesterdayStr);
      } else if (gameKey === "past_life") {
        return await handlePastLifeGet(supabase, userId, todayStr, yesterdayStr);
      } else if (gameKey === "best_duo") {
        return await handleBestDuoGet(supabase, userId, todayStr, yesterdayStr);
      } else if (gameKey === "rate_player") {
        return await handleRatePlayerGet(supabase, userId, todayStr, yesterdayStr);
      } else if (gameKey === "mafia") {
        return await handleMafiaGet(supabase, userId, todayStr, yesterdayStr);
      } else if (gameKey === "yes_no") {
        return await handleYesNoGet(supabase, userId, todayStr, yesterdayStr);
      } else if (gameKey === "secret_love") {
        return await handleSecretLoveGet(supabase, userId, todayStr);
      } else if (gameKey === "roulette") {
        return await handleRouletteGet(supabase, userId, todayStr, yesterdayStr);
      }

      return json({ error: "Unknown gameKey" }, 400);
    }

    // ─── POST: vote or claim results ───
    if (method === "POST") {
      const body = await req.json();
      const { gameKey, userId, action, ...params } = body as {
        gameKey: string;
        userId: string;
        action: "vote" | "claimResults";
        [key: string]: any;
      };

      if (!gameKey || !userId) {
        return json({ error: "gameKey and userId required" }, 400);
      }

      const todayStr = getRussiaDate();
      const yesterdayStr = getYesterdayRussiaDate();

      if (action === "vote") {
        if (gameKey === "who_of_them") {
          return await handleWhoOfThemVote(supabase, userId, todayStr, params);
        } else if (gameKey === "would_he_do_it") {
          return await handleWouldHeDoItVote(supabase, userId, todayStr, params);
        } else if (gameKey === "past_life") {
          return await handlePastLifeVote(supabase, userId, todayStr, params);
        } else if (gameKey === "best_duo") {
          return await handleBestDuoVote(supabase, userId, todayStr, params);
        } else if (gameKey === "rate_player") {
          return await handleRatePlayerVote(supabase, userId, todayStr, params);
        } else if (gameKey === "mafia") {
          return await handleMafiaVote(supabase, userId, todayStr, params);
        } else if (gameKey === "yes_no") {
          return await handleYesNoVote(supabase, userId, todayStr, params);
        } else if (gameKey === "secret_love") {
          return await handleSecretLoveVote(supabase, userId, todayStr, params);
        } else if (gameKey === "roulette") {
          return await handleRouletteVote(supabase, userId, todayStr, params);
        }
      } else if (action === "claimResults") {
        if (gameKey === "who_of_them") {
          return await handleWhoOfThemaClaim(supabase, userId, yesterdayStr);
        } else if (gameKey === "would_he_do_it") {
          return await handleWouldHeDoItClaim(supabase, userId, yesterdayStr);
        } else if (gameKey === "best_duo") {
          return await handleBestDuoClaim(supabase, userId, yesterdayStr);
        } else if (gameKey === "rate_player") {
          return await handleRatePlayerClaim(supabase, userId, yesterdayStr);
        } else if (gameKey === "yes_no") {
          return await handleYesNoClaim(supabase, userId, yesterdayStr);
        }
        // past_life, mafia, secret_love, roulette have no claim — rewards are immediate
      }

      return json({ error: "Unknown action or gameKey" }, 400);
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Internal error" }, 500);
  }
});

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ═══════════════════════════════════════════════════════════════
// GAME #2: WHO OF THEM
// ═══════════════════════════════════════════════════════════════

async function handleWhoOfThemGet(supabase: SupabaseClient, userId: string, todayStr: string, yesterdayStr: string): Promise<Response> {
  const workers = await getWorkers(supabase);
  if (workers.length < 2) return json({ error: "Недостаточно игроков" }, 400);

  const questions = QUESTIONS.who_of_them;

  // Get or create today's daily entry
  let { data: daily } = await supabase
    .from("who_of_them_daily")
    .select("*")
    .eq("game_day", todayStr)
    .maybeSingle();

  if (!daily) {
    const qIdx = pickIndex(`${todayStr}:wot:q`, questions.length);
    const players = pickNPlayers(`${todayStr}:wot:players`, workers, 2);
    const { data: newRow, error } = await supabase
      .from("who_of_them_daily")
      .insert({ game_day: todayStr, question_index: qIdx, player_1: players[0], player_2: players[1] })
      .select("*")
      .single();
    if (error) {
      const { data: retry } = await supabase.from("who_of_them_daily").select("*").eq("game_day", todayStr).maybeSingle();
      daily = retry;
    } else {
      daily = newRow;
    }
  }

  const { data: vote } = await supabase
    .from("who_of_them_votes")
    .select("selected_player, voted_at")
    .eq("game_day", todayStr)
    .eq("user_id", userId)
    .maybeSingle();

  // Yesterday's results
  let yesterdayData = null;
  const { data: yDaily } = await supabase
    .from("who_of_them_daily")
    .select("*")
    .eq("game_day", yesterdayStr)
    .maybeSingle();

  if (yDaily) {
    const { data: yVotes } = await supabase
      .from("who_of_them_votes")
      .select("selected_player")
      .eq("game_day", yesterdayStr);

    const voteCounts: Record<string, number> = {};
    for (const v of yVotes || []) {
      voteCounts[v.selected_player] = (voteCounts[v.selected_player] || 0) + 1;
    }

    const { data: yUserVote } = await supabase
      .from("who_of_them_votes")
      .select("selected_player")
      .eq("game_day", yesterdayStr)
      .eq("user_id", userId)
      .maybeSingle();

    const { data: yReward } = await supabase
      .from("who_of_them_rewards")
      .select("participation_rewarded, result_rewarded, xp_awarded, title_xp_awarded, coins_awarded")
      .eq("game_day", yesterdayStr)
      .eq("user_id", userId)
      .maybeSingle();

    // Determine winner
    const p1Votes = voteCounts[yDaily.player_1] || 0;
    const p2Votes = voteCounts[yDaily.player_2] || 0;
    let winner: string | null = null;
    if (p1Votes > p2Votes) winner = yDaily.player_1;
    else if (p2Votes > p1Votes) winner = yDaily.player_2;

    yesterdayData = {
      question: questions[yDaily.question_index] || questions[0],
      player_1: yDaily.player_1,
      player_2: yDaily.player_2,
      votes: { [yDaily.player_1]: p1Votes, [yDaily.player_2]: p2Votes },
      winner,
      userVote: yUserVote?.selected_player || null,
      reward: yReward || null,
    };
  }

  return json({
    today: {
      question: questions[daily.question_index] || questions[0],
      player_1: daily.player_1,
      player_2: daily.player_2,
      userVote: vote?.selected_player || null,
    },
    yesterday: yesterdayData,
  });
}

async function handleWhoOfThemVote(supabase: SupabaseClient, userId: string, todayStr: string, params: any): Promise<Response> {
  const { selectedPlayer } = params;
  if (!selectedPlayer) return json({ error: "selectedPlayer required" }, 400);

  // Check if already voted
  const { data: existing } = await supabase
    .from("who_of_them_votes")
    .select("id")
    .eq("game_day", todayStr)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return json({ error: "Вы уже проголосовали" }, 409);

  const { error: voteErr } = await supabase
    .from("who_of_them_votes")
    .insert({ game_day: todayStr, user_id: userId, selected_player: selectedPlayer });

  if (voteErr) {
    if (voteErr.code === "23505") return json({ error: "Вы уже проголосовали" }, 409);
    return json({ error: voteErr.message }, 500);
  }

  const result = await grantBaseReward(supabase, userId, "who_of_them", 2, todayStr, "who_of_them_rewards");

  return json({
    success: true,
    message: "Голос учтён! Результаты будут доступны завтра в 08:00",
    profile: buildProfileResponse(result.profile),
  });
}

async function handleWhoOfThemaClaim(supabase: SupabaseClient, userId: string, yesterdayStr: string): Promise<Response> {
  const { data: yDaily } = await supabase
    .from("who_of_them_daily")
    .select("*")
    .eq("game_day", yesterdayStr)
    .maybeSingle();

  if (!yDaily) return json({ error: "Вчерашняя игра не найдена" }, 400);

  const { data: yUserVote } = await supabase
    .from("who_of_them_votes")
    .select("selected_player")
    .eq("game_day", yesterdayStr)
    .eq("user_id", userId)
    .maybeSingle();

  if (!yUserVote) {
    return json({ success: true, message: "Вы не участвовали вчера", totalTitleXp: 0, totalCoins: 0 });
  }

  const { data: yReward } = await supabase
    .from("who_of_them_rewards")
    .select("id, result_rewarded")
    .eq("game_day", yesterdayStr)
    .eq("user_id", userId)
    .maybeSingle();

  if (yReward?.result_rewarded) {
    return json({ success: true, message: "Награда уже получена", alreadyClaimed: true, totalTitleXp: 0, totalCoins: 0 });
  }

  // Count votes
  const { data: yVotes } = await supabase
    .from("who_of_them_votes")
    .select("selected_player")
    .eq("game_day", yesterdayStr);

  const p1Votes = (yVotes || []).filter((v: { selected_player: string }) => v.selected_player === yDaily.player_1).length;
  const p2Votes = (yVotes || []).filter((v: { selected_player: string }) => v.selected_player === yDaily.player_2).length;

  let winner: string | null = null;
  if (p1Votes > p2Votes) winner = yDaily.player_1;
  else if (p2Votes > p1Votes) winner = yDaily.player_2;

  // No reward on draw
  if (!winner) {
    // Mark as result_rewarded=true with 0 reward to prevent repeated claims
    if (yReward) {
      await supabase.from("who_of_them_rewards").update({ result_rewarded: true }).eq("id", yReward.id);
    } else {
      await supabase.from("who_of_them_rewards").insert({ game_day: yesterdayStr, user_id: userId, participation_rewarded: true, result_rewarded: true });
    }
    return json({ success: true, message: "Ничья — награда не выдаётся", totalTitleXp: 0, totalCoins: 0, winner: null });
  }

  // Check if user's pick won
  if (yUserVote.selected_player !== winner) {
    if (yReward) {
      await supabase.from("who_of_them_rewards").update({ result_rewarded: true }).eq("id", yReward.id);
    } else {
      await supabase.from("who_of_them_rewards").insert({ game_day: yesterdayStr, user_id: userId, participation_rewarded: true, result_rewarded: true });
    }
    return json({ success: true, message: "Ваш выбор не победил", totalTitleXp: 0, totalCoins: 0, winner });
  }

  // User won — silver reward
  const claimResult = await grantResultReward(supabase, userId, "who_of_them", yesterdayStr, "who_of_them_rewards", "silver");
  const profile = await getOrCreateProfile(supabase, userId);

  return json({
    success: true,
    message: "Ваш выбор победил!",
    totalTitleXp: claimResult.titleXp,
    totalCoins: claimResult.coins,
    winner,
    profile: buildProfileResponse(profile),
  });
}

// ═══════════════════════════════════════════════════════════════
// GAME #3: WOULD HE DO IT
// ═══════════════════════════════════════════════════════════════

async function handleWouldHeDoItGet(supabase: SupabaseClient, userId: string, todayStr: string, yesterdayStr: string): Promise<Response> {
  const workers = await getWorkers(supabase);
  if (workers.length < 1) return json({ error: "Недостаточно игроков" }, 400);

  const questions = QUESTIONS.would_he_do_it;

  let { data: daily } = await supabase
    .from("would_he_do_it_daily")
    .select("*")
    .eq("game_day", todayStr)
    .maybeSingle();

  if (!daily) {
    const qIdx = pickIndex(`${todayStr}:whdi:q`, questions.length);
    const pIdx = pickIndex(`${todayStr}:whdi:player`, workers.length);
    const { data: newRow, error } = await supabase
      .from("would_he_do_it_daily")
      .insert({ game_day: todayStr, question_index: qIdx, player_name: workers[pIdx] })
      .select("*")
      .single();
    if (error) {
      const { data: retry } = await supabase.from("would_he_do_it_daily").select("*").eq("game_day", todayStr).maybeSingle();
      daily = retry;
    } else {
      daily = newRow;
    }
  }

  const { data: vote } = await supabase
    .from("would_he_do_it_votes")
    .select("vote, voted_at")
    .eq("game_day", todayStr)
    .eq("user_id", userId)
    .maybeSingle();

  let yesterdayData = null;
  const { data: yDaily } = await supabase
    .from("would_he_do_it_daily")
    .select("*")
    .eq("game_day", yesterdayStr)
    .maybeSingle();

  if (yDaily) {
    const { data: yVotes } = await supabase
      .from("would_he_do_it_votes")
      .select("vote")
      .eq("game_day", yesterdayStr);

    const yesVotes = (yVotes || []).filter((v: { vote: string }) => v.vote === "yes").length;
    const noVotes = (yVotes || []).filter((v: { vote: string }) => v.vote === "no").length;

    const { data: yUserVote } = await supabase
      .from("would_he_do_it_votes")
      .select("vote")
      .eq("game_day", yesterdayStr)
      .eq("user_id", userId)
      .maybeSingle();

    const { data: yReward } = await supabase
      .from("would_he_do_it_rewards")
      .select("participation_rewarded, result_rewarded, xp_awarded, title_xp_awarded, coins_awarded")
      .eq("game_day", yesterdayStr)
      .eq("user_id", userId)
      .maybeSingle();

    let winner: string | null = null;
    if (yesVotes > noVotes) winner = "yes";
    else if (noVotes > yesVotes) winner = "no";

    yesterdayData = {
      question: questions[yDaily.question_index] || questions[0],
      player_name: yDaily.player_name,
      yesVotes,
      noVotes,
      winner,
      userVote: yUserVote?.vote || null,
      reward: yReward || null,
    };
  }

  return json({
    today: {
      question: questions[daily.question_index] || questions[0],
      player_name: daily.player_name,
      userVote: vote?.vote || null,
    },
    yesterday: yesterdayData,
  });
}

async function handleWouldHeDoItVote(supabase: SupabaseClient, userId: string, todayStr: string, params: any): Promise<Response> {
  const { vote } = params;
  if (vote !== "yes" && vote !== "no") return json({ error: "vote must be 'yes' or 'no'" }, 400);

  const { data: existing } = await supabase
    .from("would_he_do_it_votes")
    .select("id")
    .eq("game_day", todayStr)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return json({ error: "Вы уже проголосовали" }, 409);

  const { error: voteErr } = await supabase
    .from("would_he_do_it_votes")
    .insert({ game_day: todayStr, user_id: userId, vote });

  if (voteErr) {
    if (voteErr.code === "23505") return json({ error: "Вы уже проголосовали" }, 409);
    return json({ error: voteErr.message }, 500);
  }

  const result = await grantBaseReward(supabase, userId, "would_he_do_it", 3, todayStr, "would_he_do_it_rewards");

  return json({
    success: true,
    message: "Ответ учтён! Результаты будут доступны завтра в 08:00",
    profile: buildProfileResponse(result.profile),
  });
}

async function handleWouldHeDoItClaim(supabase: SupabaseClient, userId: string, yesterdayStr: string): Promise<Response> {
  const { data: yDaily } = await supabase
    .from("would_he_do_it_daily")
    .select("*")
    .eq("game_day", yesterdayStr)
    .maybeSingle();

  if (!yDaily) return json({ error: "Вчерашняя игра не найдена" }, 400);

  const { data: yUserVote } = await supabase
    .from("would_he_do_it_votes")
    .select("vote")
    .eq("game_day", yesterdayStr)
    .eq("user_id", userId)
    .maybeSingle();

  if (!yUserVote) {
    return json({ success: true, message: "Вы не участвовали вчера", totalTitleXp: 0, totalCoins: 0 });
  }

  const { data: yReward } = await supabase
    .from("would_he_do_it_rewards")
    .select("id, result_rewarded")
    .eq("game_day", yesterdayStr)
    .eq("user_id", userId)
    .maybeSingle();

  if (yReward?.result_rewarded) {
    return json({ success: true, message: "Награда уже получена", alreadyClaimed: true, totalTitleXp: 0, totalCoins: 0 });
  }

  const { data: yVotes } = await supabase
    .from("would_he_do_it_votes")
    .select("vote")
    .eq("game_day", yesterdayStr);

  const yesVotes = (yVotes || []).filter((v: { vote: string }) => v.vote === "yes").length;
  const noVotes = (yVotes || []).filter((v: { vote: string }) => v.vote === "no").length;

  let winner: string | null = null;
  if (yesVotes > noVotes) winner = "yes";
  else if (noVotes > yesVotes) winner = "no";

  if (!winner) {
    if (yReward) {
      await supabase.from("would_he_do_it_rewards").update({ result_rewarded: true }).eq("id", yReward.id);
    } else {
      await supabase.from("would_he_do_it_rewards").insert({ game_day: yesterdayStr, user_id: userId, participation_rewarded: true, result_rewarded: true });
    }
    return json({ success: true, message: "Ничья — награда не выдаётся", totalTitleXp: 0, totalCoins: 0, winner: null });
  }

  if (yUserVote.vote !== winner) {
    if (yReward) {
      await supabase.from("would_he_do_it_rewards").update({ result_rewarded: true }).eq("id", yReward.id);
    } else {
      await supabase.from("would_he_do_it_rewards").insert({ game_day: yesterdayStr, user_id: userId, participation_rewarded: true, result_rewarded: true });
    }
    return json({ success: true, message: "Ваш выбор не победил", totalTitleXp: 0, totalCoins: 0, winner });
  }

  // Bronze reward
  const claimResult = await grantResultReward(supabase, userId, "would_he_do_it", yesterdayStr, "would_he_do_it_rewards", "bronze");
  const profile = await getOrCreateProfile(supabase, userId);

  return json({
    success: true,
    message: "Ваш выбор победил!",
    totalTitleXp: claimResult.titleXp,
    totalCoins: claimResult.coins,
    winner,
    profile: buildProfileResponse(profile),
  });
}

// ═══════════════════════════════════════════════════════════════
// GAME #4: PAST LIFE
// ═══════════════════════════════════════════════════════════════

async function handlePastLifeGet(supabase: SupabaseClient, userId: string, todayStr: string, yesterdayStr: string): Promise<Response> {
  const workers = await getWorkers(supabase);
  if (workers.length < 3) return json({ error: "Недостаточно игроков (нужно минимум 3)" }, 400);

  const questions = QUESTIONS.past_life;

  let { data: daily } = await supabase
    .from("past_life_daily")
    .select("*")
    .eq("game_day", todayStr)
    .maybeSingle();

  if (!daily) {
    const qIdx = pickIndex(`${todayStr}:pl:q`, questions.length);
    const players = pickNPlayers(`${todayStr}:pl:players`, workers, 3);
    const correctIdx = pickIndex(`${todayStr}:pl:correct`, 3);
    const { data: newRow, error } = await supabase
      .from("past_life_daily")
      .insert({
        game_day: todayStr,
        question_index: qIdx,
        player_1: players[0],
        player_2: players[1],
        player_3: players[2],
        correct_index: correctIdx,
      })
      .select("*")
      .single();
    if (error) {
      const { data: retry } = await supabase.from("past_life_daily").select("*").eq("game_day", todayStr).maybeSingle();
      daily = retry;
    } else {
      daily = newRow;
    }
  }

  const { data: vote } = await supabase
    .from("past_life_votes")
    .select("selected_index, is_correct, voted_at")
    .eq("game_day", todayStr)
    .eq("user_id", userId)
    .maybeSingle();

  // Yesterday's results
  let yesterdayData = null;
  const { data: yDaily } = await supabase
    .from("past_life_daily")
    .select("*")
    .eq("game_day", yesterdayStr)
    .maybeSingle();

  if (yDaily) {
    const { data: yVotes } = await supabase
      .from("past_life_votes")
      .select("selected_index, is_correct")
      .eq("game_day", yesterdayStr);

    const correctCount = (yVotes || []).filter((v: { is_correct: boolean }) => v.is_correct).length;
    const totalCount = (yVotes || []).length;

    const { data: yUserVote } = await supabase
      .from("past_life_votes")
      .select("selected_index, is_correct")
      .eq("game_day", yesterdayStr)
      .eq("user_id", userId)
      .maybeSingle();

    yesterdayData = {
      question: questions[yDaily.question_index] || questions[0],
      player_1: yDaily.player_1,
      player_2: yDaily.player_2,
      player_3: yDaily.player_3,
      correct_index: yDaily.correct_index,
      correctCount,
      totalCount,
      userVote: yUserVote ? { selected_index: yUserVote.selected_index, is_correct: yUserVote.is_correct } : null,
    };
  }

  const players = [daily.player_1, daily.player_2, daily.player_3];

  return json({
    today: {
      question: questions[daily.question_index] || questions[0],
      players,
      userVote: vote ? { selected_index: vote.selected_index, is_correct: vote.is_correct } : null,
      correctIndex: vote ? daily.correct_index : null,
    },
    yesterday: yesterdayData,
  });
}

async function handlePastLifeVote(supabase: SupabaseClient, userId: string, todayStr: string, params: any): Promise<Response> {
  const { selectedIndex } = params;
  if (typeof selectedIndex !== "number" || selectedIndex < 0 || selectedIndex > 2) {
    return json({ error: "selectedIndex must be 0, 1, or 2" }, 400);
  }

  const { data: existing } = await supabase
    .from("past_life_votes")
    .select("id")
    .eq("game_day", todayStr)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return json({ error: "Вы уже ответили" }, 409);

  // Get the daily entry to check correctness
  const { data: daily } = await supabase
    .from("past_life_daily")
    .select("correct_index")
    .eq("game_day", todayStr)
    .maybeSingle();

  if (!daily) return json({ error: "Игра не найдена" }, 400);

  const isCorrect = selectedIndex === daily.correct_index;

  const { error: voteErr } = await supabase
    .from("past_life_votes")
    .insert({ game_day: todayStr, user_id: userId, selected_index: selectedIndex, is_correct: isCorrect });

  if (voteErr) {
    if (voteErr.code === "23505") return json({ error: "Вы уже ответили" }, 409);
    return json({ error: voteErr.message }, 500);
  }

  // Base reward
  const result = await grantBaseReward(supabase, userId, "past_life", 4, todayStr, "past_life_rewards");

  // If correct — immediate gold reward
  let goldResult = null;
  if (isCorrect) {
    goldResult = await grantResultReward(supabase, userId, "past_life", todayStr, "past_life_rewards", "gold");
  }

  const profile = await getOrCreateProfile(supabase, userId);

  return json({
    success: true,
    isCorrect,
    correctIndex: daily.correct_index,
    message: isCorrect ? "Правильно!" : "Неправильно",
    profile: buildProfileResponse(profile),
    goldReward: goldResult ? { titleXp: goldResult.titleXp, coins: goldResult.coins } : null,
  });
}

// ═══════════════════════════════════════════════════════════════
// GAME #5: BEST DUO
// ═══════════════════════════════════════════════════════════════

async function handleBestDuoGet(supabase: SupabaseClient, userId: string, todayStr: string, yesterdayStr: string): Promise<Response> {
  const workers = await getWorkers(supabase);
  if (workers.length < 4) return json({ error: "Недостаточно игроков (нужно минимум 4)" }, 400);

  const questions = QUESTIONS.best_duo;

  let { data: daily } = await supabase
    .from("best_duo_daily")
    .select("*")
    .eq("game_day", todayStr)
    .maybeSingle();

  if (!daily) {
    const qIdx = pickIndex(`${todayStr}:bd:q`, questions.length);
    const players = pickNPlayers(`${todayStr}:bd:players`, workers, 4);
    const { data: newRow, error } = await supabase
      .from("best_duo_daily")
      .insert({
        game_day: todayStr,
        question_index: qIdx,
        player_1: players[0],
        player_2: players[1],
        player_3: players[2],
        player_4: players[3],
      })
      .select("*")
      .single();
    if (error) {
      const { data: retry } = await supabase.from("best_duo_daily").select("*").eq("game_day", todayStr).maybeSingle();
      daily = retry;
    } else {
      daily = newRow;
    }
  }

  const { data: vote } = await supabase
    .from("best_duo_votes")
    .select("selected_team, voted_at")
    .eq("game_day", todayStr)
    .eq("user_id", userId)
    .maybeSingle();

  let yesterdayData = null;
  const { data: yDaily } = await supabase
    .from("best_duo_daily")
    .select("*")
    .eq("game_day", yesterdayStr)
    .maybeSingle();

  if (yDaily) {
    const { data: yVotes } = await supabase
      .from("best_duo_votes")
      .select("selected_team")
      .eq("game_day", yesterdayStr);

    const team1Votes = (yVotes || []).filter((v: { selected_team: number }) => v.selected_team === 1).length;
    const team2Votes = (yVotes || []).filter((v: { selected_team: number }) => v.selected_team === 2).length;

    const { data: yUserVote } = await supabase
      .from("best_duo_votes")
      .select("selected_team")
      .eq("game_day", yesterdayStr)
      .eq("user_id", userId)
      .maybeSingle();

    const { data: yReward } = await supabase
      .from("best_duo_rewards")
      .select("participation_rewarded, result_rewarded, xp_awarded, title_xp_awarded, coins_awarded")
      .eq("game_day", yesterdayStr)
      .eq("user_id", userId)
      .maybeSingle();

    let winner: number | null = null;
    if (team1Votes > team2Votes) winner = 1;
    else if (team2Votes > team1Votes) winner = 2;

    yesterdayData = {
      question: questions[yDaily.question_index] || questions[0],
      team1: [yDaily.player_1, yDaily.player_2],
      team2: [yDaily.player_3, yDaily.player_4],
      team1Votes,
      team2Votes,
      winner,
      userVote: yUserVote?.selected_team || null,
      reward: yReward || null,
    };
  }

  return json({
    today: {
      question: questions[daily.question_index] || questions[0],
      team1: [daily.player_1, daily.player_2],
      team2: [daily.player_3, daily.player_4],
      userVote: vote?.selected_team || null,
    },
    yesterday: yesterdayData,
  });
}

async function handleBestDuoVote(supabase: SupabaseClient, userId: string, todayStr: string, params: any): Promise<Response> {
  const { selectedTeam } = params;
  if (selectedTeam !== 1 && selectedTeam !== 2) return json({ error: "selectedTeam must be 1 or 2" }, 400);

  const { data: existing } = await supabase
    .from("best_duo_votes")
    .select("id")
    .eq("game_day", todayStr)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return json({ error: "Вы уже проголосовали" }, 409);

  const { error: voteErr } = await supabase
    .from("best_duo_votes")
    .insert({ game_day: todayStr, user_id: userId, selected_team: selectedTeam });

  if (voteErr) {
    if (voteErr.code === "23505") return json({ error: "Вы уже проголосовали" }, 409);
    return json({ error: voteErr.message }, 500);
  }

  const result = await grantBaseReward(supabase, userId, "best_duo", 5, todayStr, "best_duo_rewards");

  return json({
    success: true,
    message: "Голос учтён! Результаты будут доступны завтра в 08:00",
    profile: buildProfileResponse(result.profile),
  });
}

async function handleBestDuoClaim(supabase: SupabaseClient, userId: string, yesterdayStr: string): Promise<Response> {
  const { data: yDaily } = await supabase
    .from("best_duo_daily")
    .select("*")
    .eq("game_day", yesterdayStr)
    .maybeSingle();

  if (!yDaily) return json({ error: "Вчерашняя игра не найдена" }, 400);

  const { data: yUserVote } = await supabase
    .from("best_duo_votes")
    .select("selected_team")
    .eq("game_day", yesterdayStr)
    .eq("user_id", userId)
    .maybeSingle();

  if (!yUserVote) {
    return json({ success: true, message: "Вы не участвовали вчера", totalTitleXp: 0, totalCoins: 0 });
  }

  const { data: yReward } = await supabase
    .from("best_duo_rewards")
    .select("id, result_rewarded")
    .eq("game_day", yesterdayStr)
    .eq("user_id", userId)
    .maybeSingle();

  if (yReward?.result_rewarded) {
    return json({ success: true, message: "Награда уже получена", alreadyClaimed: true, totalTitleXp: 0, totalCoins: 0 });
  }

  const { data: yVotes } = await supabase
    .from("best_duo_votes")
    .select("selected_team")
    .eq("game_day", yesterdayStr);

  const team1Votes = (yVotes || []).filter((v: { selected_team: number }) => v.selected_team === 1).length;
  const team2Votes = (yVotes || []).filter((v: { selected_team: number }) => v.selected_team === 2).length;

  let winner: number | null = null;
  if (team1Votes > team2Votes) winner = 1;
  else if (team2Votes > team1Votes) winner = 2;

  if (!winner) {
    if (yReward) {
      await supabase.from("best_duo_rewards").update({ result_rewarded: true }).eq("id", yReward.id);
    } else {
      await supabase.from("best_duo_rewards").insert({ game_day: yesterdayStr, user_id: userId, participation_rewarded: true, result_rewarded: true });
    }
    return json({ success: true, message: "Ничья — награда не выдаётся", totalTitleXp: 0, totalCoins: 0, winner: null });
  }

  if (yUserVote.selected_team !== winner) {
    if (yReward) {
      await supabase.from("best_duo_rewards").update({ result_rewarded: true }).eq("id", yReward.id);
    } else {
      await supabase.from("best_duo_rewards").insert({ game_day: yesterdayStr, user_id: userId, participation_rewarded: true, result_rewarded: true });
    }
    return json({ success: true, message: "Ваш выбор не победил", totalTitleXp: 0, totalCoins: 0, winner });
  }

  const claimResult = await grantResultReward(supabase, userId, "best_duo", yesterdayStr, "best_duo_rewards", "silver");
  const profile = await getOrCreateProfile(supabase, userId);

  return json({
    success: true,
    message: "Ваш дуэт победил!",
    totalTitleXp: claimResult.titleXp,
    totalCoins: claimResult.coins,
    winner,
    profile: buildProfileResponse(profile),
  });
}

// ═══════════════════════════════════════════════════════════════
// GAME #6: RATE PLAYER
// ═══════════════════════════════════════════════════════════════

async function handleRatePlayerGet(supabase: SupabaseClient, userId: string, todayStr: string, yesterdayStr: string): Promise<Response> {
  const workers = await getWorkers(supabase);
  if (workers.length < 1) return json({ error: "Недостаточно игроков" }, 400);

  const questions = QUESTIONS.rate_player;

  let { data: daily } = await supabase
    .from("rate_player_daily")
    .select("*")
    .eq("game_day", todayStr)
    .maybeSingle();

  if (!daily) {
    const qIdx = pickIndex(`${todayStr}:rp:q`, questions.length);
    const pIdx = pickIndex(`${todayStr}:rp:player`, workers.length);
    const { data: newRow, error } = await supabase
      .from("rate_player_daily")
      .insert({ game_day: todayStr, question_index: qIdx, player_name: workers[pIdx] })
      .select("*")
      .single();
    if (error) {
      const { data: retry } = await supabase.from("rate_player_daily").select("*").eq("game_day", todayStr).maybeSingle();
      daily = retry;
    } else {
      daily = newRow;
    }
  }

  const { data: vote } = await supabase
    .from("rate_player_votes")
    .select("rating, voted_at")
    .eq("game_day", todayStr)
    .eq("user_id", userId)
    .maybeSingle();

  let yesterdayData = null;
  const { data: yDaily } = await supabase
    .from("rate_player_daily")
    .select("*")
    .eq("game_day", yesterdayStr)
    .maybeSingle();

  if (yDaily) {
    const { data: yVotes } = await supabase
      .from("rate_player_votes")
      .select("rating")
      .eq("game_day", yesterdayStr);

    const ratings = (yVotes || []).map((v: { rating: number }) => v.rating);
    const avgRating = ratings.length > 0 ? (ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length) : 0;

    const { data: yUserVote } = await supabase
      .from("rate_player_votes")
      .select("rating")
      .eq("game_day", yesterdayStr)
      .eq("user_id", userId)
      .maybeSingle();

    const { data: yReward } = await supabase
      .from("rate_player_rewards")
      .select("participation_rewarded, result_rewarded, xp_awarded, title_xp_awarded, coins_awarded")
      .eq("game_day", yesterdayStr)
      .eq("user_id", userId)
      .maybeSingle();

    yesterdayData = {
      question: questions[yDaily.question_index] || questions[0],
      player_name: yDaily.player_name,
      avgRating: Math.round(avgRating * 10) / 10,
      totalVotes: ratings.length,
      userVote: yUserVote?.rating ?? null,
      reward: yReward || null,
    };
  }

  return json({
    today: {
      question: questions[daily.question_index] || questions[0],
      player_name: daily.player_name,
      userVote: vote?.rating ?? null,
    },
    yesterday: yesterdayData,
  });
}

async function handleRatePlayerVote(supabase: SupabaseClient, userId: string, todayStr: string, params: any): Promise<Response> {
  const { rating } = params;
  if (typeof rating !== "number" || rating < 0 || rating > 5 || !Number.isInteger(rating)) {
    return json({ error: "rating must be an integer 0-5" }, 400);
  }

  const { data: existing } = await supabase
    .from("rate_player_votes")
    .select("id")
    .eq("game_day", todayStr)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return json({ error: "Вы уже оценили" }, 409);

  const { error: voteErr } = await supabase
    .from("rate_player_votes")
    .insert({ game_day: todayStr, user_id: userId, rating });

  if (voteErr) {
    if (voteErr.code === "23505") return json({ error: "Вы уже оценили" }, 409);
    return json({ error: voteErr.message }, 500);
  }

  // Base reward
  const result = await grantBaseReward(supabase, userId, "rate_player", 6, todayStr, "rate_player_rewards");

  // Immediate silver reward for completing the rating
  const silverResult = await grantResultReward(supabase, userId, "rate_player", todayStr, "rate_player_rewards", "silver");
  const profile = await getOrCreateProfile(supabase, userId);

  return json({
    success: true,
    message: "Оценка принята! Результаты будут доступны завтра в 08:00",
    profile: buildProfileResponse(profile),
    silverReward: { titleXp: silverResult.titleXp, coins: silverResult.coins },
  });
}

async function handleRatePlayerClaim(supabase: SupabaseClient, userId: string, yesterdayStr: string): Promise<Response> {
  // Rate player has no claim — rewards are immediate. But we return yesterday's stats.
  const { data: yDaily } = await supabase
    .from("rate_player_daily")
    .select("*")
    .eq("game_day", yesterdayStr)
    .maybeSingle();

  if (!yDaily) return json({ success: true, message: "Нет вчерашних данных" });

  const { data: yVotes } = await supabase
    .from("rate_player_votes")
    .select("rating")
    .eq("game_day", yesterdayStr);

  const ratings = (yVotes || []).map((v: { rating: number }) => v.rating);
  const avgRating = ratings.length > 0 ? (ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length) : 0;

  return json({
    success: true,
    question: QUESTIONS.rate_player[yDaily.question_index] || QUESTIONS.rate_player[0],
    player_name: yDaily.player_name,
    avgRating: Math.round(avgRating * 10) / 10,
    totalVotes: ratings.length,
  });
}

// ═══════════════════════════════════════════════════════════════
// GAME #7: MAFIA — guess the mafia among 5 players, max 2 attempts
// ═══════════════════════════════════════════════════════════════

async function handleMafiaGet(supabase: SupabaseClient, userId: string, todayStr: string, yesterdayStr: string): Promise<Response> {
  const workers = await getWorkers(supabase);
  if (workers.length < 5) return json({ error: "Недостаточно игроков (нужно минимум 5)" }, 400);

  // Get or create today's mafia_daily (shared for all users)
  let { data: daily } = await supabase
    .from("mafia_daily")
    .select("*")
    .eq("game_day", todayStr)
    .maybeSingle();

  if (!daily) {
    const players = pickNPlayers(`${todayStr}:mafia:players`, workers, 5);
    const mafiaIdx = pickIndex(`${todayStr}:mafia:correct`, 5);
    const { data: newRow, error } = await supabase
      .from("mafia_daily")
      .insert({
        game_day: todayStr,
        question_index: 0,
        player_1: players[0], player_2: players[1], player_3: players[2],
        player_4: players[3], player_5: players[4],
        mafia_index: mafiaIdx,
      })
      .select("*")
      .single();
    if (error) {
      const { data: retry } = await supabase.from("mafia_daily").select("*").eq("game_day", todayStr).maybeSingle();
      daily = retry;
    } else {
      daily = newRow;
    }
  }

  // Get or create user state
  let { data: userState } = await supabase
    .from("mafia_user_state")
    .select("*")
    .eq("game_day", todayStr)
    .eq("user_id", userId)
    .maybeSingle();

  if (!userState) {
    const { data: newState } = await supabase
      .from("mafia_user_state")
      .insert({ game_day: todayStr, user_id: userId })
      .select("*")
      .single();
    userState = newState;
  }

  // Yesterday's stats
  let yesterdayData = null;
  const { data: yDaily } = await supabase
    .from("mafia_daily")
    .select("*")
    .eq("game_day", yesterdayStr)
    .maybeSingle();

  if (yDaily) {
    const yPlayers = [yDaily.player_1, yDaily.player_2, yDaily.player_3, yDaily.player_4, yDaily.player_5];
    const mafiaName = yPlayers[yDaily.mafia_index];

    const { data: yStates } = await supabase
      .from("mafia_user_state")
      .select("found_mafia, attempt_count, game_ended")
      .eq("game_day", yesterdayStr)
      .eq("game_ended", true);

    const states = yStates || [];
    const totalPlayed = states.length;
    const guessed = states.filter((s: { found_mafia: boolean }) => s.found_mafia).length;
    const notGuessed = totalPlayed - guessed;
    const firstTry = states.filter((s: { found_mafia: boolean; attempt_count: number }) => s.found_mafia && s.attempt_count === 1).length;
    const secondTry = states.filter((s: { found_mafia: boolean; attempt_count: number }) => s.found_mafia && s.attempt_count === 2).length;

    yesterdayData = {
      mafia: mafiaName,
      guessed,
      notGuessed,
      firstTry,
      secondTry,
      totalPlayed,
    };
  }

  const players = [daily.player_1, daily.player_2, daily.player_3, daily.player_4, daily.player_5];
  const eliminated: number[] = [];
  if (userState.eliminated_1 !== null && userState.eliminated_1 !== undefined) eliminated.push(userState.eliminated_1);
  if (userState.eliminated_2 !== null && userState.eliminated_2 !== undefined) eliminated.push(userState.eliminated_2);

  return json({
    today: {
      players,
      attemptCount: userState.attempt_count,
      eliminated,
      foundMafia: userState.found_mafia,
      gameEnded: userState.game_ended,
      // Only reveal mafia index when game is ended
      mafiaIndex: userState.game_ended ? daily.mafia_index : null,
    },
    yesterday: yesterdayData,
  });
}

async function handleMafiaVote(supabase: SupabaseClient, userId: string, todayStr: string, params: any): Promise<Response> {
  const { selectedIndex } = params;
  if (typeof selectedIndex !== "number" || selectedIndex < 0 || selectedIndex > 4) {
    return json({ error: "selectedIndex must be 0-4" }, 400);
  }

  // Get daily entry
  const { data: daily } = await supabase
    .from("mafia_daily")
    .select("*")
    .eq("game_day", todayStr)
    .maybeSingle();
  if (!daily) return json({ error: "Игра не найдена" }, 400);

  // Get or create user state
  let { data: userState } = await supabase
    .from("mafia_user_state")
    .select("*")
    .eq("game_day", todayStr)
    .eq("user_id", userId)
    .maybeSingle();

  if (!userState) {
    const { data: newState } = await supabase
      .from("mafia_user_state")
      .insert({ game_day: todayStr, user_id: userId })
      .select("*")
      .single();
    userState = newState;
  }

  // Already ended?
  if (userState.game_ended) {
    return json({ error: "Игра уже завершена", gameEnded: true, mafiaIndex: daily.mafia_index }, 409);
  }

  // Already used 2 attempts?
  if (userState.attempt_count >= 2) {
    return json({ error: "Попытки закончились" }, 400);
  }

  // Can't pick already eliminated
  const eliminated: number[] = [];
  if (userState.eliminated_1 !== null && userState.eliminated_1 !== undefined) eliminated.push(userState.eliminated_1);
  if (userState.eliminated_2 !== null && userState.eliminated_2 !== undefined) eliminated.push(userState.eliminated_2);
  if (eliminated.includes(selectedIndex)) {
    return json({ error: "Этот игрок уже выбран" }, 400);
  }

  const isMafia = selectedIndex === daily.mafia_index;
  const attemptNum = userState.attempt_count + 1;

  // Record attempt
  await supabase.from("mafia_attempts").insert({
    game_day: todayStr, user_id: userId, attempt_number: attemptNum,
    selected_index: selectedIndex, is_mafia: isMafia,
  });

  if (isMafia) {
    // Won!
    const tier = attemptNum === 1 ? "gold" : "silver";
    // Gold ×3 for first try = +9 title_xp, +9 coins; Silver ×2 for second = +6, +6
    const multiplier = attemptNum === 1 ? 3 : 2;
    const titleXpAmount = RESULT_REWARDS.gold.titleXp * multiplier;
    const coinsAmount = RESULT_REWARDS.gold.coins * multiplier;

    // Update user state
    await supabase
      .from("mafia_user_state")
      .update({
        attempt_count: attemptNum,
        found_mafia: true,
        game_ended: true,
        eliminated_2: userState.eliminated_1 === null || userState.eliminated_1 === undefined ? selectedIndex : userState.eliminated_1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userState.id);

    // Grant base reward
    const reward = await getOrCreateRewardRow(supabase, "mafia_rewards", todayStr, userId);
    if (!reward.participation_rewarded) {
      await supabase.from("mafia_rewards").update({
        participation_rewarded: true,
        xp_awarded: (reward.xp_awarded || 0) + BASE_XP,
        coins_awarded: (reward.coins_awarded || 0) + BASE_COINS,
      }).eq("id", reward.id);
      await addOrdinaryXp(supabase, userId, BASE_XP, "mafia_play", "mafia", todayStr);
      await addCoins(supabase, userId, BASE_COINS, "mafia_play", "mafia", todayStr);
    }

    // Grant result reward
    await supabase.from("mafia_rewards").update({
      result_rewarded: true,
      title_xp_awarded: (reward.title_xp_awarded || 0) + titleXpAmount,
      coins_awarded: (reward.coins_awarded || 0) + coinsAmount,
    }).eq("id", reward.id);
    const reason = attemptNum === 1 ? "mafia_first_try_win" : "mafia_second_try_win";
    await addTitleXp(supabase, userId, titleXpAmount, reason, "mafia", todayStr);
    await addCoins(supabase, userId, coinsAmount, reason, "mafia", todayStr);

    // Record completion + check bonus
    await recordCompletion(supabase, userId, "mafia", todayStr);
    await checkAndGrantAllGamesBonus(supabase, userId, todayStr);

    const profile = await getOrCreateProfile(supabase, userId);
    return json({
      success: true,
      isMafia: true,
      attemptNumber: attemptNum,
      gameEnded: true,
      mafiaIndex: daily.mafia_index,
      titleXpAwarded: titleXpAmount,
      coinsAwarded: coinsAmount,
      profile: buildProfileResponse(profile),
    });
  }

  // Wrong guess
  if (attemptNum === 1) {
    // First wrong — allow second attempt
    await supabase
      .from("mafia_user_state")
      .update({
        attempt_count: 1,
        eliminated_1: selectedIndex,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userState.id);

    return json({
      success: true,
      isMafia: false,
      attemptNumber: 1,
      gameEnded: false,
      remainingAttempts: 1,
    });
  } else {
    // Second wrong — game over, grant base reward only
    await supabase
      .from("mafia_user_state")
      .update({
        attempt_count: 2,
        eliminated_2: selectedIndex,
        found_mafia: false,
        game_ended: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userState.id);

    // Grant base reward
    const reward = await getOrCreateRewardRow(supabase, "mafia_rewards", todayStr, userId);
    if (!reward.participation_rewarded) {
      await supabase.from("mafia_rewards").update({
        participation_rewarded: true,
        xp_awarded: (reward.xp_awarded || 0) + BASE_XP,
        coins_awarded: (reward.coins_awarded || 0) + BASE_COINS,
      }).eq("id", reward.id);
      await addOrdinaryXp(supabase, userId, BASE_XP, "mafia_play", "mafia", todayStr);
      await addCoins(supabase, userId, BASE_COINS, "mafia_play", "mafia", todayStr);
    }

    // Record completion + check bonus
    await recordCompletion(supabase, userId, "mafia", todayStr);
    await checkAndGrantAllGamesBonus(supabase, userId, todayStr);

    const profile = await getOrCreateProfile(supabase, userId);
    return json({
      success: true,
      isMafia: false,
      attemptNumber: 2,
      gameEnded: true,
      mafiaIndex: daily.mafia_index,
      profile: buildProfileResponse(profile),
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// GAME #8: YES/NO — vote yes or no, result next day
// ═══════════════════════════════════════════════════════════════

async function handleYesNoGet(supabase: SupabaseClient, userId: string, todayStr: string, yesterdayStr: string): Promise<Response> {
  const workers = await getWorkers(supabase);
  if (workers.length < 1) return json({ error: "Недостаточно игроков" }, 400);

  const questions = QUESTIONS.yes_no;

  let { data: daily } = await supabase
    .from("yes_no_daily")
    .select("*")
    .eq("game_day", todayStr)
    .maybeSingle();

  if (!daily) {
    const qIdx = pickIndex(`${todayStr}:yn:q`, questions.length);
    const pIdx = pickIndex(`${todayStr}:yn:player`, workers.length);
    const { data: newRow, error } = await supabase
      .from("yes_no_daily")
      .insert({ game_day: todayStr, question_index: qIdx, player_name: workers[pIdx] })
      .select("*")
      .single();
    if (error) {
      const { data: retry } = await supabase.from("yes_no_daily").select("*").eq("game_day", todayStr).maybeSingle();
      daily = retry;
    } else {
      daily = newRow;
    }
  }

  const { data: vote } = await supabase
    .from("yes_no_votes")
    .select("vote")
    .eq("game_day", todayStr)
    .eq("user_id", userId)
    .maybeSingle();

  // Yesterday's results
  let yesterdayData = null;
  const { data: yDaily } = await supabase
    .from("yes_no_daily")
    .select("*")
    .eq("game_day", yesterdayStr)
    .maybeSingle();

  if (yDaily) {
    const { data: yVotes } = await supabase
      .from("yes_no_votes")
      .select("vote")
      .eq("game_day", yesterdayStr);

    const yesVotes = (yVotes || []).filter((v: { vote: string }) => v.vote === "yes").length;
    const noVotes = (yVotes || []).filter((v: { vote: string }) => v.vote === "no").length;

    const { data: yUserVote } = await supabase
      .from("yes_no_votes")
      .select("vote")
      .eq("game_day", yesterdayStr)
      .eq("user_id", userId)
      .maybeSingle();

    const { data: yReward } = await supabase
      .from("yes_no_rewards")
      .select("participation_rewarded, result_rewarded, xp_awarded, title_xp_awarded, coins_awarded")
      .eq("game_day", yesterdayStr)
      .eq("user_id", userId)
      .maybeSingle();

    let winner: string | null = null;
    if (yesVotes > noVotes) winner = "yes";
    else if (noVotes > yesVotes) winner = "no";

    yesterdayData = {
      question: questions[yDaily.question_index] || questions[0],
      player_name: yDaily.player_name,
      yesVotes,
      noVotes,
      winner,
      userVote: yUserVote?.vote || null,
      reward: yReward || null,
    };
  }

  return json({
    today: {
      question: questions[daily.question_index] || questions[0],
      player_name: daily.player_name,
      userVote: vote?.vote || null,
    },
    yesterday: yesterdayData,
  });
}

async function handleYesNoVote(supabase: SupabaseClient, userId: string, todayStr: string, params: any): Promise<Response> {
  const { vote } = params;
  if (vote !== "yes" && vote !== "no") return json({ error: "vote must be 'yes' or 'no'" }, 400);

  const { data: existing } = await supabase
    .from("yes_no_votes")
    .select("id")
    .eq("game_day", todayStr)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return json({ error: "Вы уже ответили" }, 409);

  const { error: voteErr } = await supabase
    .from("yes_no_votes")
    .insert({ game_day: todayStr, user_id: userId, vote });

  if (voteErr) {
    if (voteErr.code === "23505") return json({ error: "Вы уже ответили" }, 409);
    return json({ error: voteErr.message }, 500);
  }

  const result = await grantBaseReward(supabase, userId, "yes_no", 8, todayStr, "yes_no_rewards");

  return json({
    success: true,
    message: "Ответ учтён! Результаты будут доступны завтра в 08:00",
    profile: buildProfileResponse(result.profile),
  });
}

async function handleYesNoClaim(supabase: SupabaseClient, userId: string, yesterdayStr: string): Promise<Response> {
  const { data: yDaily } = await supabase
    .from("yes_no_daily")
    .select("*")
    .eq("game_day", yesterdayStr)
    .maybeSingle();

  if (!yDaily) return json({ error: "Вчерашняя игра не найдена" }, 400);

  const { data: yUserVote } = await supabase
    .from("yes_no_votes")
    .select("vote")
    .eq("game_day", yesterdayStr)
    .eq("user_id", userId)
    .maybeSingle();

  if (!yUserVote) {
    return json({ success: true, message: "Вы не участвовали вчера", totalTitleXp: 0, totalCoins: 0 });
  }

  const { data: yReward } = await supabase
    .from("yes_no_rewards")
    .select("id, result_rewarded")
    .eq("game_day", yesterdayStr)
    .eq("user_id", userId)
    .maybeSingle();

  if (yReward?.result_rewarded) {
    return json({ success: true, message: "Награда уже получена", alreadyClaimed: true, totalTitleXp: 0, totalCoins: 0 });
  }

  const { data: yVotes } = await supabase
    .from("yes_no_votes")
    .select("vote")
    .eq("game_day", yesterdayStr);

  const yesVotes = (yVotes || []).filter((v: { vote: string }) => v.vote === "yes").length;
  const noVotes = (yVotes || []).filter((v: { vote: string }) => v.vote === "no").length;

  let winner: string | null = null;
  if (yesVotes > noVotes) winner = "yes";
  else if (noVotes > yesVotes) winner = "no";

  if (!winner) {
    if (yReward) {
      await supabase.from("yes_no_rewards").update({ result_rewarded: true }).eq("id", yReward.id);
    } else {
      await supabase.from("yes_no_rewards").insert({ game_day: yesterdayStr, user_id: userId, participation_rewarded: true, result_rewarded: true });
    }
    return json({ success: true, message: "Ничья — награда не выдаётся", totalTitleXp: 0, totalCoins: 0, winner: null });
  }

  if (yUserVote.vote !== winner) {
    if (yReward) {
      await supabase.from("yes_no_rewards").update({ result_rewarded: true }).eq("id", yReward.id);
    } else {
      await supabase.from("yes_no_rewards").insert({ game_day: yesterdayStr, user_id: userId, participation_rewarded: true, result_rewarded: true });
    }
    return json({ success: true, message: "Ваш выбор не победил", totalTitleXp: 0, totalCoins: 0, winner });
  }

  // User won — silver reward
  const claimResult = await grantResultReward(supabase, userId, "yes_no", yesterdayStr, "yes_no_rewards", "silver");
  const profile = await getOrCreateProfile(supabase, userId);

  return json({
    success: true,
    message: "Ваш выбор победил!",
    totalTitleXp: claimResult.titleXp,
    totalCoins: claimResult.coins,
    winner,
    profile: buildProfileResponse(profile),
  });
}

// ═══════════════════════════════════════════════════════════════
// GAME #9: SECRET LOVE — individual 3 players, immediate result
// ═══════════════════════════════════════════════════════════════

async function handleSecretLoveGet(supabase: SupabaseClient, userId: string, todayStr: string): Promise<Response> {
  const workers = await getWorkers(supabase);
  if (workers.length < 3) return json({ error: "Недостаточно игроков (нужно минимум 3)" }, 400);

  // Get or create per-user daily entry
  let { data: userDaily } = await supabase
    .from("secret_love_user_daily")
    .select("*")
    .eq("game_day", todayStr)
    .eq("user_id", userId)
    .maybeSingle();

  if (!userDaily) {
    const players = pickNPlayers(`${todayStr}:sl:${userId}:players`, workers, 3);
    const correctIdx = pickIndex(`${todayStr}:sl:${userId}:correct`, 3);
    const { data: newRow, error } = await supabase
      .from("secret_love_user_daily")
      .insert({
        game_day: todayStr, user_id: userId,
        player_1: players[0], player_2: players[1], player_3: players[2],
        correct_index: correctIdx,
      })
      .select("*")
      .single();
    if (error) {
      const { data: retry } = await supabase
        .from("secret_love_user_daily")
        .select("*")
        .eq("game_day", todayStr)
        .eq("user_id", userId)
        .maybeSingle();
      userDaily = retry;
    } else {
      userDaily = newRow;
    }
  }

  const { data: userState } = await supabase
    .from("secret_love_user_state")
    .select("selected_index, is_correct")
    .eq("game_day", todayStr)
    .eq("user_id", userId)
    .maybeSingle();

  const players = [userDaily.player_1, userDaily.player_2, userDaily.player_3];

  return json({
    today: {
      question: "Кто из них тайно в тебя влюблён?",
      players,
      userVote: userState ? { selected_index: userState.selected_index, is_correct: userState.is_correct } : null,
      // Only reveal correct index after answering
      correctIndex: userState ? userDaily.correct_index : null,
    },
    yesterday: null, // No shared stats for this game
  });
}

async function handleSecretLoveVote(supabase: SupabaseClient, userId: string, todayStr: string, params: any): Promise<Response> {
  const { selectedIndex } = params;
  if (typeof selectedIndex !== "number" || selectedIndex < 0 || selectedIndex > 2) {
    return json({ error: "selectedIndex must be 0, 1, or 2" }, 400);
  }

  // Check if already answered
  const { data: existing } = await supabase
    .from("secret_love_user_state")
    .select("id")
    .eq("game_day", todayStr)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return json({ error: "Вы уже ответили" }, 409);

  // Get user daily entry
  const { data: userDaily } = await supabase
    .from("secret_love_user_daily")
    .select("correct_index")
    .eq("game_day", todayStr)
    .eq("user_id", userId)
    .maybeSingle();

  if (!userDaily) return json({ error: "Игра не найдена" }, 400);

  const isCorrect = selectedIndex === userDaily.correct_index;

  const { error: stateErr } = await supabase
    .from("secret_love_user_state")
    .insert({ game_day: todayStr, user_id: userId, selected_index: selectedIndex, is_correct: isCorrect });

  if (stateErr) {
    if (stateErr.code === "23505") return json({ error: "Вы уже ответили" }, 409);
    return json({ error: stateErr.message }, 500);
  }

  // Base reward
  const result = await grantBaseReward(supabase, userId, "secret_love", 9, todayStr, "secret_love_rewards");

  // If correct — silver reward
  let silverResult = null;
  if (isCorrect) {
    silverResult = await grantResultReward(supabase, userId, "secret_love", todayStr, "secret_love_rewards", "silver");
  }

  const profile = await getOrCreateProfile(supabase, userId);

  return json({
    success: true,
    isCorrect,
    correctIndex: userDaily.correct_index,
    message: isCorrect ? "Правильно!" : "Неправильно",
    profile: buildProfileResponse(profile),
    silverReward: silverResult ? { titleXp: silverResult.titleXp, coins: silverResult.coins } : null,
  });
}

// ═══════════════════════════════════════════════════════════════
// GAME #10: ROULETTE — 50/50, backend-determined, immediate result
// ═══════════════════════════════════════════════════════════════

async function handleRouletteGet(supabase: SupabaseClient, userId: string, todayStr: string, yesterdayStr: string): Promise<Response> {
  const workers = await getWorkers(supabase);
  if (workers.length < 2) return json({ error: "Недостаточно игроков" }, 400);

  // Filter out the user themselves
  const opponents = workers.filter((w) => w !== userId);
  if (opponents.length < 1) return json({ error: "Недостаточно противников" }, 400);

  // Get or create per-user daily entry
  let { data: userDaily } = await supabase
    .from("roulette_user_daily")
    .select("*")
    .eq("game_day", todayStr)
    .eq("user_id", userId)
    .maybeSingle();

  if (!userDaily) {
    const oIdx = pickIndex(`${todayStr}:rl:${userId}:opponent`, opponents.length);
    const { data: newRow, error } = await supabase
      .from("roulette_user_daily")
      .insert({ game_day: todayStr, user_id: userId, opponent_name: opponents[oIdx] })
      .select("*")
      .single();
    if (error) {
      const { data: retry } = await supabase
        .from("roulette_user_daily")
        .select("*")
        .eq("game_day", todayStr)
        .eq("user_id", userId)
        .maybeSingle();
      userDaily = retry;
    } else {
      userDaily = newRow;
    }
  }

  // Check if already played
  const { data: userState } = await supabase
    .from("roulette_user_state")
    .select("result")
    .eq("game_day", todayStr)
    .eq("user_id", userId)
    .maybeSingle();

  // Yesterday's stats
  let yesterdayData = null;
  const { data: yStates } = await supabase
    .from("roulette_user_state")
    .select("result")
    .eq("game_day", yesterdayStr);

  if (yStates && yStates.length > 0) {
    const wins = yStates.filter((s: { result: string }) => s.result === "win").length;
    const losses = yStates.filter((s: { result: string }) => s.result === "lose").length;
    yesterdayData = {
      wins,
      losses,
      total: yStates.length,
    };
  }

  return json({
    today: {
      opponent_name: userDaily.opponent_name,
      result: userState?.result || null,
    },
    yesterday: yesterdayData,
  });
}

async function handleRouletteVote(supabase: SupabaseClient, userId: string, todayStr: string, _params: any): Promise<Response> {
  // Check if already played
  const { data: existing } = await supabase
    .from("roulette_user_state")
    .select("id, result")
    .eq("game_day", todayStr)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    return json({ error: "Вы уже сыграли сегодня", result: existing.result }, 409);
  }

  // Get opponent
  const { data: userDaily } = await supabase
    .from("roulette_user_daily")
    .select("opponent_name")
    .eq("game_day", todayStr)
    .eq("user_id", userId)
    .maybeSingle();

  if (!userDaily) return json({ error: "Игра не найдена" }, 400);

  // Backend determines result: 50/50
  const randomVal = Math.random();
  const result = randomVal < 0.5 ? "win" : "lose";

  // Record result
  const { error: stateErr } = await supabase
    .from("roulette_user_state")
    .insert({ game_day: todayStr, user_id: userId, result });

  if (stateErr) {
    if (stateErr.code === "23505") return json({ error: "Вы уже сыграли сегодня", result: "win" }, 409);
    return json({ error: stateErr.message }, 500);
  }

  // Base reward (always)
  const baseResult = await grantBaseReward(supabase, userId, "roulette", 10, todayStr, "roulette_rewards");

  // If win — gold reward
  let goldResult = null;
  if (result === "win") {
    goldResult = await grantResultReward(supabase, userId, "roulette", todayStr, "roulette_rewards", "gold");
  }

  const profile = await getOrCreateProfile(supabase, userId);

  return json({
    success: true,
    result,
    opponent_name: userDaily.opponent_name,
    profile: buildProfileResponse(profile),
    goldReward: goldResult ? { titleXp: goldResult.titleXp, coins: goldResult.coins } : null,
  });
}
