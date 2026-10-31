const { supabase, getAdminFromReq, ok, err, cors } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") { cors(res); return res.status(200).end(); }
  if (req.method !== "POST") return err(res, "Method not allowed", 405);

  try {
    const admin = await getAdminFromReq(req);
    if (!admin) return err(res, "Yetkisiz", 401);

    const { ticket_id, message } = req.body || {};
    if (!ticket_id || !message) return err(res, "Eksik bilgi");

    // Cevabı kaydet
    await supabase.from("support_replies").insert({
      ticket_id, message, by_admin: true
    });

    // Talebin durumunu 'cevaplandı' yap
    await supabase.from("support_tickets").update({ status: "answered" }).eq("id", ticket_id);

    return ok(res, { message: "Cevap gönderildi" });
  } catch (e) {
    console.error(e);
    return err(res, "Sunucu hatası", 500);
  }
};