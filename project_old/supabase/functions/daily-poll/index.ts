import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Russia timezone (UTC+3) — server-side date so all users see the same day
function getRussiaDate(date: Date = new Date()): string {
  const russiaTime = new Date(date.getTime() + (3 * 60 * 60 * 1000));
  return russiaTime.toISOString().slice(0, 10);
}

// Seedable random — deterministic question selection per day
function seededRandom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h) + seed.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

// XP system helpers (must match mini-games edge function)
const LEVEL_TITLES: Record<number, string> = {
  1: "Генеральный директор паники", 2: "Магистр ордена лени", 3: "Заслуженный соня галактики",
  4: "Эксперт по ничегонеделанию", 5: "Профессиональный душнила", 6: "Король косяков",
  7: "Главный по тарелочкам", 8: "Министр чаепития", 9: "Хранитель офисного холодильника",
  10: "Повелитель дедлайнов", 11: "Чемпион по прокрастинации", 12: "Граф Дратути",
  13: "Барон Авось", 14: "Ведущий специалист по мемам", 15: "Адвокат котиков",
  16: "Легендарный пожиратель пиццы", 17: "Верховный главнокомандующий диванными войсками",
  18: "Маршал ленивых выходных", 19: "Заслуженный грабленаступатель", 20: "Доктор диванных наук",
  21: "Мастер спорта по поеданию вкусняшек", 22: "Профессиональный искатель приключений на свою голову",
  23: "Главный консультант по глупым вопросам", 24: "Шериф кофейного автомата",
  25: "Президент клуба любителей поспать", 26: "Босс финального уровня лени",
  27: "Хранитель священного пульта", 28: "Султан подушек", 29: "Рыцарь круглого торта",
  30: "Навигатор по холодильнику", 31: "Эксперт по созданию неловких ситуаций",
  32: "Почетный донор нервных клеток", 33: "Генератор случайных мыслей",
  34: "Директор по свежести воздуха", 35: "Инженер человеческих косяков",
  36: "Командир отряда полуночников", 37: "Великий комбинатор отговорок",
  38: "Магистр белой и черной магии лени", 39: "Главный архитектор воздушных замков",
  40: "Заслуженный артист разговорного жанра у кулера", 41: "Профессор околовсяческих наук",
  42: "Капитан очевидность второго ранга", 43: "Повелитель чайных пакетиков",
  44: "Гуру спонтанных покупок", 45: "Секретный агент одеялка",
  46: "Менеджер по связям с космосом", 47: "Укротитель будильников",
  48: "Магистр кошачьей психологии", 49: "Абсолютный чемпион по залипанию в телефон",
};
const MAX_LEVEL = 49;

function xpForLevel(level: number): number { return level * 100; }

function recalcLevel(xp: number): { level: number; title: string } {
  let level = 1;
  let remaining = xp;
  while (level < MAX_LEVEL) {
    const needed = xpForLevel(level);
    if (remaining >= needed) { remaining -= needed; level++; } else break;
  }
  return { level, title: level >= MAX_LEVEL ? LEVEL_TITLES[MAX_LEVEL] : (LEVEL_TITLES[level] || LEVEL_TITLES[1]) };
}

// Pick a deterministic question for a given date
function pickQuestionIndex(dateStr: string, count: number): number {
  return seededRandom(dateStr + ":question") % count;
}

// Placement rewards: 1st=30/5, 2nd=20/3, 3rd=10/1
const PLACEMENT_REWARDS: Record<number, { xp: number; titleXp: number }> = {
  1: { xp: 30, titleXp: 5 },
  2: { xp: 20, titleXp: 3 },
  3: { xp: 10, titleXp: 1 },
};

// Count votes per candidate and determine placement across ALL voted candidates
function computeResults(
  votes: { selected_candidates: string[] }[]
): { candidate: string; votes: number; placement: number }[] {
  const voteCounts: Record<string, number> = {};
  for (const v of votes) {
    for (const c of v.selected_candidates) {
      if (voteCounts[c] !== undefined) voteCounts[c]++;
      else voteCounts[c] = 1;
    }
  }
  const ranked = Object.entries(voteCounts)
    .map(([candidate, v]) => ({ candidate, votes: v }))
    .sort((a, b) => b.votes - a.votes || a.candidate.localeCompare(b.candidate));
  return ranked.map((r, i) => ({ ...r, placement: i + 1 }));
}

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

    // ─── GET: get poll state for current user ───
    if (method === "GET") {
      const userId = url.searchParams.get("userId");
      if (!userId) {
        return new Response(JSON.stringify({ error: "userId required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const todayStr = getRussiaDate();
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterdayStr = getRussiaDate(yesterdayDate);

      // Get or create today's poll (question only — no pre-selected candidates)
      let { data: todayPoll } = await supabase
        .from("daily_polls")
        .select("id, question_id, poll_date")
        .eq("poll_date", todayStr)
        .maybeSingle();

      if (!todayPoll) {
        const { data: questions } = await supabase
          .from("daily_poll_questions")
          .select("id, question")
          .eq("active", true)
          .order("id", { ascending: true });

        if (!questions || questions.length === 0) {
          return new Response(JSON.stringify({ error: "Нет активных вопросов" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const qIdx = pickQuestionIndex(todayStr, questions.length);
        const question = questions[qIdx];

        const { data: newPoll, error: pollErr } = await supabase
          .from("daily_polls")
          .insert({ question_id: question.id, poll_date: todayStr })
          .select("id, question_id, poll_date")
          .single();

        if (pollErr || !newPoll) {
          const { data: retryPoll } = await supabase
            .from("daily_polls")
            .select("id, question_id, poll_date")
            .eq("poll_date", todayStr)
            .maybeSingle();
          todayPoll = retryPoll;
        } else {
          todayPoll = newPoll;
        }
      }

      if (!todayPoll) {
        return new Response(JSON.stringify({ error: "Не удалось создать опрос" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: todayQuestion } = await supabase
        .from("daily_poll_questions")
        .select("question")
        .eq("id", todayPoll.question_id)
        .single();

      const { data: todayVote } = await supabase
        .from("daily_poll_user_votes")
        .select("selected_candidates, voted_at")
        .eq("daily_poll_id", todayPoll.id)
        .eq("user_id", userId)
        .maybeSingle();

      // Yesterday's poll + results
      const { data: yesterdayPoll } = await supabase
        .from("daily_polls")
        .select("id, question_id, poll_date")
        .eq("poll_date", yesterdayStr)
        .maybeSingle();

      let yesterdayData = null;
      if (yesterdayPoll) {
        const { data: yQuestion } = await supabase
          .from("daily_poll_questions")
          .select("question")
          .eq("id", yesterdayPoll.question_id)
          .single();

        const { data: yVotes } = await supabase
          .from("daily_poll_user_votes")
          .select("selected_candidates")
          .eq("daily_poll_id", yesterdayPoll.id);

        const results = computeResults(yVotes || []);

        const { data: yUserVote } = await supabase
          .from("daily_poll_user_votes")
          .select("selected_candidates")
          .eq("daily_poll_id", yesterdayPoll.id)
          .eq("user_id", userId)
          .maybeSingle();

        const { data: yReward } = await supabase
          .from("daily_poll_rewards")
          .select("participation_rewarded, result_rewarded, xp_awarded, title_xp_awarded")
          .eq("daily_poll_id", yesterdayPoll.id)
          .eq("user_id", userId)
          .maybeSingle();

        yesterdayData = {
          pollId: yesterdayPoll.id,
          question: yQuestion?.question || "",
          results,
          userVote: yUserVote?.selected_candidates || null,
          reward: yReward || null,
        };
      }

      return new Response(JSON.stringify({
        today: {
          pollId: todayPoll.id,
          question: todayQuestion?.question || "",
          userVote: todayVote?.selected_candidates || null,
          votedAt: todayVote?.voted_at || null,
        },
        yesterday: yesterdayData,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── POST: vote or claim results ───
    if (method === "POST") {
      const body = await req.json();
      const { userId, action: bodyAction, selectedCandidates } = body as {
        userId: string;
        action: "vote" | "claimResults";
        selectedCandidates?: string[];
      };

      if (!userId) {
        return new Response(JSON.stringify({ error: "userId required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const todayStr = getRussiaDate();

      // ─── Vote action ───
      if (bodyAction === "vote") {
        if (!selectedCandidates || selectedCandidates.length < 1 || selectedCandidates.length > 3) {
          return new Response(JSON.stringify({ error: "Выберите от 1 до 3 кандидатов" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: todayPoll } = await supabase
          .from("daily_polls")
          .select("id")
          .eq("poll_date", todayStr)
          .maybeSingle();

        if (!todayPoll) {
          return new Response(JSON.stringify({ error: "Опрос не найден" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Check if already voted
        const { data: existingVote } = await supabase
          .from("daily_poll_user_votes")
          .select("id")
          .eq("daily_poll_id", todayPoll.id)
          .eq("user_id", userId)
          .maybeSingle();

        if (existingVote) {
          return new Response(JSON.stringify({ error: "Вы уже проголосовали" }), {
            status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error: voteErr } = await supabase
          .from("daily_poll_user_votes")
          .insert({
            daily_poll_id: todayPoll.id,
            user_id: userId,
            selected_candidates: selectedCandidates,
          });

        if (voteErr) {
          if (voteErr.code === "23505") {
            return new Response(JSON.stringify({ error: "Вы уже проголосовали" }), {
              status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          return new Response(JSON.stringify({ error: voteErr.message }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Award participation XP (+10 XP, +2 title progress) — only once
        const { data: existingReward } = await supabase
          .from("daily_poll_rewards")
          .select("id, participation_rewarded")
          .eq("daily_poll_id", todayPoll.id)
          .eq("user_id", userId)
          .maybeSingle();

        let shouldAward = false;
        if (!existingReward) {
          const { error: rewardInsertErr } = await supabase
            .from("daily_poll_rewards")
            .insert({
              daily_poll_id: todayPoll.id,
              user_id: userId,
              participation_rewarded: true,
              result_rewarded: false,
              xp_awarded: 10,
              title_xp_awarded: 2,
            });
          shouldAward = !rewardInsertErr;
        } else if (!existingReward.participation_rewarded) {
          const { error: rewardUpdateErr } = await supabase
            .from("daily_poll_rewards")
            .update({ participation_rewarded: true, xp_awarded: 10, title_xp_awarded: 2 })
            .eq("id", existingReward.id);
          shouldAward = !rewardUpdateErr;
        }

        if (shouldAward) {
          await addXpToProfile(supabase, userId, 10);
        }

        return new Response(JSON.stringify({
          success: true,
          message: "Голос учтён! Результаты будут доступны завтра в 08:00",
          selectedCandidates,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── Claim results action ───
      if (bodyAction === "claimResults") {
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayStr = getRussiaDate(yesterdayDate);

        const { data: yPoll } = await supabase
          .from("daily_polls")
          .select("id")
          .eq("poll_date", yesterdayStr)
          .maybeSingle();

        if (!yPoll) {
          return new Response(JSON.stringify({ error: "Вчерашний опрос не найден" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: yUserVote } = await supabase
          .from("daily_poll_user_votes")
          .select("selected_candidates")
          .eq("daily_poll_id", yPoll.id)
          .eq("user_id", userId)
          .maybeSingle();

        if (!yUserVote) {
          return new Response(JSON.stringify({
            success: true,
            message: "Вы не участвовали во вчерашнем опросе",
            totalXp: 0,
            totalTitleXp: 0,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: yReward } = await supabase
          .from("daily_poll_rewards")
          .select("id, result_rewarded, xp_awarded, title_xp_awarded")
          .eq("daily_poll_id", yPoll.id)
          .eq("user_id", userId)
          .maybeSingle();

        if (yReward?.result_rewarded) {
          return new Response(JSON.stringify({
            success: true,
            message: "Награда уже получена",
            totalXp: yReward.xp_awarded - 10,
            totalTitleXp: yReward.title_xp_awarded - 2,
            alreadyClaimed: true,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: yVotes } = await supabase
          .from("daily_poll_user_votes")
          .select("selected_candidates")
          .eq("daily_poll_id", yPoll.id);

        const results = computeResults(yVotes || []);

        let totalXp = 0;
        let totalTitleXp = 0;
        const breakdown: { candidate: string; placement: number; xp: number; titleXp: number }[] = [];

        for (const sel of yUserVote.selected_candidates) {
          const result = results.find((r) => r.candidate === sel);
          if (result && result.placement <= 3) {
            const reward = PLACEMENT_REWARDS[result.placement];
            totalXp += reward.xp;
            totalTitleXp += reward.titleXp;
            breakdown.push({ candidate: sel, placement: result.placement, xp: reward.xp, titleXp: reward.titleXp });
          }
        }

        if (yReward) {
          await supabase
            .from("daily_poll_rewards")
            .update({
              result_rewarded: true,
              xp_awarded: (yReward.xp_awarded || 10) + totalXp,
              title_xp_awarded: (yReward.title_xp_awarded || 2) + totalTitleXp,
            })
            .eq("id", yReward.id);
        } else {
          await supabase
            .from("daily_poll_rewards")
            .insert({
              daily_poll_id: yPoll.id,
              user_id: userId,
              participation_rewarded: true,
              result_rewarded: true,
              xp_awarded: 10 + totalXp,
              title_xp_awarded: 2 + totalTitleXp,
            });
        }

        if (totalXp > 0) {
          await addXpToProfile(supabase, userId, totalXp);
        }

        return new Response(JSON.stringify({
          success: true,
          totalXp,
          totalTitleXp,
          breakdown,
          results,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function addXpToProfile(supabase: ReturnType<typeof createClient>, userId: string, xpToAdd: number): Promise<void> {
  let { data: profile } = await supabase
    .from("mini_game_profile")
    .select("user_id, xp, coins, title")
    .eq("user_id", userId)
    .maybeSingle();

  if (!profile) {
    const { data: newProfile } = await supabase
      .from("mini_game_profile")
      .insert({ user_id: userId, level: 1, xp: 0, coins: 0, title: LEVEL_TITLES[1] })
      .select("user_id, xp, coins, title")
      .single();
    profile = newProfile;
  }

  if (!profile) return;

  const newXp = profile.xp + xpToAdd;
  const { level, title } = recalcLevel(newXp);

  await supabase
    .from("mini_game_profile")
    .update({ xp: newXp, level, title, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
}
