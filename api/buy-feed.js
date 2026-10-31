const { supabase, getUserFromReq, ok, err, cors, ensureFarm } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") { cors(res); return res.status(200).end(); }
  if (req.method !== "POST") return err(res, "Method not allowed", 405);

  try {
    const user = await getUserFromReq(req);
    if (!user) return err(res, "Oturum bulunamadı", 401);

    const { amount } = req.body || {};
    const qty = Math.max(1, parseInt(amount) || 10);
    const space = await (async () => {
      const farm = await ensureFarm(user.id);
      return Number(farm.feed_cap) - Number(farm.feed);
    })();
    const realAmount = Math.min(qty, space);
    if (realAmount <= 0) return err(res, "Yem deposu dolu");

    const cost = realAmount * 5;
    const farm = await ensureFarm(user.id);
    if (Number(farm.wallet) < cost) return err(res, "Yetersiz bakiye");

    await supabase.from("farms").update({
      wallet: Number(farm.wallet) - cost,
      total_spent: Number(farm.total_spent) + cost,
      feed: Number(farm.feed) + realAmount,
      feed_bought: Number(farm.feed_bought) + realAmount
    }).eq("user_id", user.id);

    await supabase.from("history").insert({
      user_id: user.id, type: "feed", description: `${realAmount} birim yem alımı`, amount: -cost
    });

    return ok(res, { message: `${realAmount} yem alındı`, cost });
  } catch (e) {
    console.error(e);
    return err(res, "Sunucu hatası", 500);
  }
};