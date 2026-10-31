const { supabase, getAdminFromReq, ok, err, cors } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") { cors(res); return res.status(200).end(); }
  if (req.method !== "POST") return err(res, "Method not allowed", 405);

  try {
    const admin = await getAdminFromReq(req);
    if (!admin) return err(res, "Yetkisiz", 401);

    const { type, id } = req.body || {};
    if (!id || (type !== "load" && type !== "withdraw")) return err(res, "Geçersiz istek");

    if (type === "load") {
      // Bakiye Yükleme Onayı
      const { data: lr } = await supabase.from("load_requests").select("*").eq("id", id).single();
      if (!lr || lr.status !== "pending") return err(res, "Talep bulunamadı veya zaten işlenmiş");
      
      await supabase.from("load_requests").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", id);
      
      const { data: farm } = await supabase.from("farms").select("*").eq("user_id", lr.user_id).single();
      await supabase.from("farms").update({
        wallet: Number(farm.wallet) + Number(lr.amount),
        total_loaded: Number(farm.total_loaded) + Number(lr.amount)
      }).eq("user_id", lr.user_id);
      
      await supabase.from("history").insert({
        user_id: lr.user_id, type: "load", description: "Papara ile bakiye yükleme (Admin onaylı)", amount: lr.amount
      });
    } else if (type === "withdraw") {
      // Para Çekme Onayı
      const { data: wr } = await supabase.from("withdraw_requests").select("*").eq("id", id).single();
      if (!wr || wr.status !== "pending") return err(res, "Talep bulunamadı veya zaten işlenmiş");
      
      await supabase.from("withdraw_requests").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", id);
      
      // Not: Çekim talebi oluşturulurken zaten bakiyeden düşülüyordu (withdraw.js dosyasında).
      // Bu yüzden burada sadece talebi onaylıyoruz, ekstra bakiye düşmüyoruz.
      
      await supabase.from("history").insert({
        user_id: wr.user_id, type: "withdraw", description: "Banka hesabına para çekme (Admin onaylı)", amount: -wr.amount
      });
    }

    return ok(res, { message: "Talep başarıyla onaylandı" });
  } catch (e) {
    console.error(e);
    return err(res, "Sunucu hatası", 500);
  }
};