const { getUserFromReq, ok, err, cors, supabase, ensureFarm } = require("./_lib");

const ANIMALS = {
  tavuk: { name:"Tavuk", emoji:"🐔", price:150,  monthly:300,   product:"yumurta", feedPerDay:0.2 },
  ari:   { name:"Arı",   emoji:"🐝", price:500,  monthly:1500,  product:"bal",     feedPerDay:0.1 },
  koyun: { name:"Koyun", emoji:"🐑", price:2000, monthly:5000,  product:"sut",     feedPerDay:1 },
  inek:  { name:"İnek",  emoji:"🐄", price:5000, monthly:15000, product:"peynir",  feedPerDay:3 },
};
const SEC_PER_MONTH = 86400 * 30;
const ANIMAL_LIFE_SEC = 86400 * 30;

// client-side hesap için: yaşları güncelle
async function advanceAges(userId, farm) {
  const now = new Date();
  const lastTick = new Date(farm.last_tick);
  const deltaSec = Math.max(0, (now - lastTick) / 1000);
  if (deltaSec <= 0) return farm;

  // hayvan yaşlarını artır
  const { data: animals } = await supabase.from("animals").select("*").eq("user_id", userId);
  if (animals && animals.length > 0) {
    const updates = animals.map(a => supabase.from("animals").update({ age_seconds: Number(a.age_seconds) + deltaSec }).eq("id", a.id));
    await Promise.all(updates);
  }

  // ürün üretimi (canlı hayvanlar)
  const aliveCounts = { tavuk:0, ari:0, koyun:0, inek:0 };
  animals.forEach(a => { if (Number(a.age_seconds) < ANIMAL_LIFE_SEC) aliveCounts[a.type]++; });

  // yem kontrolü
  const feedFactor = Number(farm.feed) > 0 ? 1 : 0;

  for (const key in ANIMALS) {
    if (aliveCounts[key] > 0 && feedFactor > 0) {
      const animal = ANIMALS[key];
      const perSec = animal.monthly / SEC_PER_MONTH;
      const secUnits = perSec / ({yumurta:2,bal:10,sut:8,peynir:25}[animal.product]);
      const inc = secUnits * deltaSec * aliveCounts[key];
      if (inc > 0) {
        const { data: inv } = await supabase.from("inventory").select("amount").eq("user_id", userId).eq("product", animal.product).single();
        if (inv) {
          await supabase.from("inventory").update({ amount: Number(inv.amount) + inc }).eq("user_id", userId).eq("product", animal.product);
        }
      }
    }
  }

  // yem tüketimi (gün bazlı — kabaca gün geçtiyse)
  let feedNeed = 0;
  for (const k in aliveCounts) feedNeed += aliveCounts[k] * ANIMALS[k].feedPerDay;
  const daysPassed = deltaSec / 86400;
  const feedUsed = feedNeed * daysPassed;
  const realUsed = Math.min(feedUsed, Number(farm.feed));
  const newFeed = Math.max(0, Number(farm.feed) - realUsed);
  await supabase.from("farms").update({
    feed: newFeed,
    feed_used: Number(farm.feed_used) + realUsed,
    last_tick: now.toISOString()
  }).eq("user_id", userId);

  return { ...farm, feed: newFeed, last_tick: now.toISOString() };
}

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") { cors(res); return res.status(200).end(); }
  try {
    const user = await getUserFromReq(req);
    if (!user) return err(res, "Oturum bulunamadı", 401);

    let farm = await ensureFarm(user.id);
    farm = await advanceAges(user.id, farm);

    const [animalsRes, inventoryRes, historyRes, loadReqRes, withdrawRes, ticketsRes] = await Promise.all([
      supabase.from("animals").select("*").eq("user_id", user.id),
      supabase.from("inventory").select("*").eq("user_id", user.id),
      supabase.from("history").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
      supabase.from("load_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("withdraw_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("support_tickets").select("*, support_replies(*)").eq("user_id", user.id).order("created_at", { ascending: false })
    ]);

    return ok(res, {
      user: { id: user.id, name: user.name, phone: user.phone, avatar: user.avatar, joined: user.created_at },
      farm,
      animals: animalsRes.data || [],
      inventory: inventoryRes.data || [],
      history: historyRes.data || [],
      loadRequests: loadReqRes.data || [],
      withdrawRequests: withdrawRes.data || [],
      tickets: ticketsRes.data || []
    });
  } catch (e) {
    console.error(e);
    return err(res, "Sunucu hatası: " + e.message, 500);
  }
};