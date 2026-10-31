const { supabase, getUserFromReq, ok, err, cors } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") { cors(res); return res.status(200).end(); }
  if (req.method !== "POST") return err(res, "Method not allowed", 405);

  try {
    const user = await getUserFromReq(req);
    if (!user) return err(res, "Oturum bulunamadı", 401);

    const { subject, message } = req.body || {};
    if (!subject) return err(res, "Konu seçin");
    if (!message || message.length < 10) return err(res, "Mesaj en az 10 karakter olmalı");

    const { data, error } = await supabase.from("support_tickets").insert({
      user_id: user.id, subject, message, status: "pending"
    }).select().single();
    if (error) return err(res, error.message);

    return ok(res, { ticket: data });
  } catch (e) {
    console.error(e);
    return err(res, "Sunucu hatası", 500);
  }
};