const { supabase, getUserFromReq, ok, err, cors, ensureFarm } = require("./_lib");

const BASE_PRICES = { yumurta:2, bal:10, sut:8, peynir:25 };

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") { cors(res); return res.status(200).end(); }
  if (req.method !== "POST") return err(res, "Method not allowed", 405);

  try {
    const user = await getUserFromReq(req);
    if (!user) return err(res, "Oturum bulunamadı", 401);

    const { product } = req.body || {};
    if (!BASE_PRICES[product]) return err(res, "Geçersiz ürün");

    const { data: inv } = await supabase.from("inventory").select("amount").eq("user_id", user.id).eq("product", product).single();
    const amount = Number(inv?.amount || 0);
    if (amount <= 0) return err(res, "Satacak ürün yok");

    const price = BASE_PRICES[product];
    const earned = amount * price;
    const farm = await ensureFarm(user.id);

    await supabase.from("inventory").update({ amount: 0 }).eq("user_id", user.id).eq("product", product);
    await supabase.from("farms").update({
      wallet: Number(farm.wallet) + earned,
      total_sold: Number(farm.total_sold) + earned
    }).eq("user_id", user.id);

    await supabase.from("history").insert({
      user_id: user.id, type: "sell", description: `${amount.toFixed(2)} ${product} satışı`, amount: earned
    });

    return ok(res, { message: "Satış yapıldı", earned, amount });
  } catch (e) {
    console.error(e);
    return err(res, "Sunucu hatası", 500);
  }
};