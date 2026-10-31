const { supabase, getUserFromReq, ok, err, cors, ensureFarm } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") { cors(res); return res.status(200).end(); }
  if (req.method !== "POST") return err(res, "Method not allowed", 405);

  try {
    const user = await getUserFromReq(req);
    if (!user) return err(res, "Oturum bulunamadı", 401);

    const { amount, bank, iban, name } = req.body || {};
    const amt = parseFloat(amount);
    if (!amt || amt < 500) return err(res, "Minimum çekim 500 ₺");
    if (!bank || !iban || !name) return err(res, "Banka, IBAN ve isim gerekli");

    const farm = await ensureFarm(user.id);
    if (Number(farm.wallet) < amt) return err(res, "Yetersiz bakiye");

    await supabase.from("withdraw_requests").insert({
      user_id: user.id, amount: amt, bank, iban, name, status: "pending"
    });
    await supabase.from("farms").update({
      wallet: Number(farm.wallet) - amt,
      total_withdrawn: Number(farm.total_withdrawn) + amt
    }).eq("user_id", user.id);

    return ok(res, { message: "Çekim talebi oluşturuldu" });
  } catch (e) {
    console.error(e);
    return err(res, "Sunucu hatası", 500);
  }
};