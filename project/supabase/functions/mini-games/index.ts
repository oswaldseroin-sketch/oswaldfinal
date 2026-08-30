import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const LEVEL_TITLES: Record<number, string> = {
  1: "Генеральный директор паники",
  2: "Магистр ордена лени",
  3: "Заслуженный соня галактики",
  4: "Эксперт по ничегонеделанию",
  5: "Профессиональный душнила",
  6: "Король косяков",
  7: "Главный по тарелочкам",
  8: "Министр чаепития",
  9: "Хранитель офисного холодильника",
  10: "Повелитель дедлайнов",
  11: "Чемпион по прокрастинации",
  12: "Граф Дратути",
  13: "Барон Авось",
  14: "Ведущий специалист по мемам",
  15: "Адвокат котиков",
  16: "Легендарный пожиратель пиццы",
  17: "Верховный главнокомандующий диванными войсками",
  18: "Маршал ленивых выходных",
  19: "Заслуженный грабленаступатель",
  20: "Доктор диванных наук",
  21: "Мастер спорта по поеданию вкусняшек",
  22: "Профессиональный искатель приключений на свою голову",
  23: "Главный консультант по глупым вопросам",
  24: "Шериф кофейного автомата",
  25: "Президент клуба любителей поспать",
  26: "Босс финального уровня лени",
  27: "Хранитель священного пульта",
  28: "Султан подушек",
  29: "Рыцарь круглого торта",
  30: "Навигатор по холодильнику",
  31: "Эксперт по созданию неловких ситуаций",
  32: "Почетный донор нервных клеток",
  33: "Генератор случайных мыслей",
  34: "Директор по свежести воздуха",
  35: "Инженер человеческих косяков",
  36: "Командир отряда полуночников",
  37: "Великий комбинатор отговорок",
  38: "Магистр белой и черной магии лени",
  39: "Главный архитектор воздушных замков",
  40: "Заслуженный артист разговорного жанра у кулера",
  41: "Профессор околовсяческих наук",
  42: "Капитан очевидность второго ранга",
  43: "Повелитель чайных пакетиков",
  44: "Гуру спонтанных покупок",
  45: "Секретный агент одеялка",
  46: "Менеджер по связям с космосом",
  47: "Укротитель будильников",
  48: "Магистр кошачьей психологии",
  49: "Абсолютный чемпион по залипанию в телефон",
};

const MAX_LEVEL = 49;

function xpForLevel(level: number): number {
  return level * 100;
}

function recalcLevel(xp: number): { level: number; title: string } {
  let level = 1;
  let remaining = xp;
  while (level < MAX_LEVEL) {
    const needed = xpForLevel(level);
    if (remaining >= needed) {
      remaining -= needed;
      level++;
    } else {
      break;
    }
  }
  return { level, title: level >= MAX_LEVEL ? LEVEL_TITLES[MAX_LEVEL] : (LEVEL_TITLES[level] || LEVEL_TITLES[1]) };
}

// Title XP system helpers (must match mini-games-2-6 edge function)
const TITLE_TITLES: string[] = [
  "Силиконовый ослик", "Нюхач куртки Семяшкина", "Кривошляпа из Забугоровки",
  "Экзорцист туалетных кабин", "Министр бумажной духоты", "Дилер семечек",
  "Спонсор депрессии", "Экстремальный потребитель тормозков", "Кибер-пельмень в тумане",
  "Жертва медального танца", "Облизыватель журнала сдачи", "Бреющий во сне",
  "Диванный самурай Амальгамы", "Коллекционер использованных ручек", "Мастер интриг на КПП",
  "Повелитель сыворотки правды", "Святой отец кнопочных телефонов", "Энергетический вампир на чилле",
  "Душитель подушек", "Архангел КПП", "Король-Призрак", "Бессмертный Всадник",
  "Несущий Истину", "Великий Инквизитор", "Магистр Ордена",
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
  return 0;
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

function currentLevelXP(xp: number): { level: number; currentXp: number; neededXp: number; title: string } {
  const { level, title } = recalcLevel(xp);
  let spent = 0;
  for (let l = 1; l < level; l++) {
    spent += xpForLevel(l);
  }
  const currentXp = xp - spent;
  const neededXp = level >= MAX_LEVEL ? currentXp : xpForLevel(level);
  return { level, currentXp, neededXp, title };
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

    // GET /mini-games?userId=xxx — get or create profile + progress
    if (method === "GET") {
      const userId = url.searchParams.get("userId");
      if (!userId) {
        return new Response(JSON.stringify({ error: "userId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get or create profile
      let { data: profile, error: profErr } = await supabase
        .from("mini_game_profile")
        .select("user_id, level, xp, coins, title, title_xp, title_level, updated_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (profErr) {
        return new Response(JSON.stringify({ error: profErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!profile) {
        const { data: newProfile, error: insertErr } = await supabase
          .from("mini_game_profile")
          .insert({ user_id: userId, level: 1, xp: 0, coins: 0, title: LEVEL_TITLES[1], title_xp: 0, title_level: 1 })
          .select("user_id, level, xp, coins, title, title_xp, title_level, updated_at")
          .single();
        if (insertErr) {
          return new Response(JSON.stringify({ error: insertErr.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        profile = newProfile;
      }

      // Get progress
      const { data: progress, error: progErr } = await supabase
        .from("mini_game_progress")
        .select("game_number, completed, best_score, played_at")
        .eq("user_id", userId)
        .order("game_number", { ascending: true });

      if (progErr) {
        return new Response(JSON.stringify({ error: progErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { level, currentXp, neededXp, title } = currentLevelXP(profile.xp);
      const titleInfo = recalcTitleLevel(profile.title_xp || 0);

      return new Response(JSON.stringify({
        profile: {
          user_id: profile.user_id,
          level,
          xp: profile.xp,
          currentXp,
          neededXp,
          coins: profile.coins,
          title: titleInfo.title,
          titleLevel: titleInfo.level,
          titleXp: profile.title_xp || 0,
          titleCurrentXp: titleInfo.currentXp,
          titleNeededXp: titleInfo.neededXp,
        },
        progress: progress || [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /mini-games — add XP and/or coins, auto-recalculate level
    if (method === "POST") {
      const body = await req.json();
      const { userId, addXp, addCoins } = body as {
        userId: string;
        addXp?: number;
        addCoins?: number;
      };

      if (!userId) {
        return new Response(JSON.stringify({ error: "userId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get or create profile
      let { data: profile, error: profErr } = await supabase
        .from("mini_game_profile")
        .select("user_id, level, xp, coins, title")
        .eq("user_id", userId)
        .maybeSingle();

      if (profErr) {
        return new Response(JSON.stringify({ error: profErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!profile) {
        const { data: newProfile, error: insertErr } = await supabase
          .from("mini_game_profile")
          .insert({ user_id: userId, level: 1, xp: 0, coins: 0, title: LEVEL_TITLES[1] })
          .select("user_id, level, xp, coins, title")
          .single();
        if (insertErr) {
          return new Response(JSON.stringify({ error: insertErr.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        profile = newProfile;
      }

      const newXp = profile.xp + (addXp || 0);
      const newCoins = profile.coins + (addCoins || 0);
      const { level, title } = recalcLevel(newXp);

      const { data: updated, error: updateErr } = await supabase
        .from("mini_game_profile")
        .update({ xp: newXp, coins: newCoins, level, title, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .select("user_id, level, xp, coins, title, updated_at")
        .single();

      if (updateErr) {
        return new Response(JSON.stringify({ error: updateErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { currentXp, neededXp } = currentLevelXP(updated.xp);

      return new Response(JSON.stringify({
        profile: {
          user_id: updated.user_id,
          level: updated.level,
          xp: updated.xp,
          currentXp,
          neededXp,
          coins: updated.coins,
          title: updated.title,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PATCH /mini-games — upsert progress for a specific game
    if (method === "PATCH") {
      const body = await req.json();
      const { userId, gameNumber, completed, bestScore } = body as {
        userId: string;
        gameNumber: number;
        completed?: boolean;
        bestScore?: number;
      };

      if (!userId || typeof gameNumber !== "number" || gameNumber < 1 || gameNumber > 10) {
        return new Response(JSON.stringify({ error: "userId and gameNumber (1-10) required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: existing } = await supabase
        .from("mini_game_progress")
        .select("id, completed, best_score")
        .eq("user_id", userId)
        .eq("game_number", gameNumber)
        .maybeSingle();

      let result;
      if (existing) {
        const updates: Record<string, unknown> = { played_at: new Date().toISOString() };
        if (completed !== undefined) updates.completed = completed;
        if (bestScore !== undefined) updates.best_score = Math.max(existing.best_score, bestScore);
        const { data, error } = await supabase
          .from("mini_game_progress")
          .update(updates)
          .eq("id", existing.id)
          .select("game_number, completed, best_score, played_at")
          .single();
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        result = data;
      } else {
        const { data, error } = await supabase
          .from("mini_game_progress")
          .insert({
            user_id: userId,
            game_number: gameNumber,
            completed: completed || false,
            best_score: bestScore || 0,
          })
          .select("game_number, completed, best_score, played_at")
          .single();
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        result = data;
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
