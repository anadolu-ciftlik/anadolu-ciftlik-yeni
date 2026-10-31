const { supabase, getUserFromReq, ok, err, cors } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") { cors(res); return res.status(200).end(); }
  if (req.method !== "POST") return err(res, "Method not allowed", 405);

  try {
    const user = await getUserFromReq(req);
    if (!user) return err(res, "Oturum bulunamadı", 401);

    const { amount } = req.body || {};
    const amt = parseFloat(amount);
    if (!amt || amt < 50) return err(res, "Minimum yükleme tutarı 50 ₺");

    const { data, error } = await supabase.from("load_requests").insert({
      user_id: user.id, amount: amt, status: "pending"
    }).select().single();
    if (error) return err(res, error.message);

    return ok(res, { request: data });
  } catch (e) {
    console.error(e);
    return err(res, "Sunucu hatası", 500);
  }
};