const { supabase, getUserFromReq, ok, err, cors, ensureFarm } = require("./_lib");

const PRICES = { tavuk:150, ari:500, koyun:2000, inek:5000 };
const NAMES = { tavuk:"Tavuk", ari:"Arı", koyun:"Koyun", inek:"İnek" };

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") { cors(res); return res.status(200).end(); }
  if (req.method !== "POST") return err(res, "Method not allowed", 405);

  try {
    const user = await getUserFromReq(req);
    if (!user) return err(res, "Oturum bulunamadı", 401);

    const { type, qty } = req.body || {};
    if (!PRICES[type]) return err(res, "Geçersiz hayvan türü");
    const quantity = Math.max(1, parseInt(qty) || 1);
    const cost = PRICES[type] * quantity;

    const farm = await ensureFarm(user.id);
    if (Number(farm.wallet) < cost) return err(res, "Yetersiz bakiye");

    // hayvanları ekle
    const rows = [];
    for (let i = 0; i < quantity; i++) rows.push({ user_id: user.id, type, age_seconds: 0 });
    const { error: insErr } = await supabase.from("animals").insert(rows);
    if (insErr) return err(res, insErr.message);

    // bakiyeyi düş
    await supabase.from("farms").update({
      wallet: Number(farm.wallet) - cost,
      total_spent: Number(farm.total_spent) + cost
    }).eq("user_id", user.id);

    await supabase.from("history").insert({
      user_id: user.id, type: "buy", description: `${quantity} adet ${NAMES[type]} yatırımı`, amount: -cost
    });

    return ok(res, { message: `${quantity} adet ${NAMES[type]} alındı`, cost });
  } catch (e) {
    console.error(e);
    return err(res, "Sunucu hatası", 500);
  }
};