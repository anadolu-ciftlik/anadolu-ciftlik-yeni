const { supabase, getAdminFromReq, ok, err, cors } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") { cors(res); return res.status(200).end(); }
  if (req.method !== "POST") return err(res, "Method not allowed", 405);

  try {
    const admin = await getAdminFromReq(req);
    if (!admin) return err(res, "Yetkisiz", 401);

    const { type, id, reason } = req.body || {};
    if (!id || (type !== "load" && type !== "withdraw")) return err(res, "Geçersiz istek");

    const rejectReason = reason || "Admin tarafından reddedildi";

    if (type === "load") {
      const { data: lr } = await supabase.from("load_requests").select("*").eq("id", id).single();
      if (!lr || lr.status !== "pending") return err(res, "Talep bulunamadı veya işlenmiş");
      
      await supabase.from("load_requests").update({ 
        status: "rejected", 
        reject_reason: rejectReason 
      }).eq("id", id);

    } else if (type === "withdraw") {
      const { data: wr } = await supabase.from("withdraw_requests").select("*").eq("id", id).single();
      if (!wr || wr.status !== "pending") return err(res, "Talep bulunamadı veya işlenmiş");
      
      // Çekim reddedildiyse, kullanıcının parasını geri iade et
      const { data: farm } = await supabase.from("farms").select("*").eq("user_id", wr.user_id).single();
      await supabase.from("farms").update({
        wallet: Number(farm.wallet) + Number(wr.amount),
        total_withdrawn: Number(farm.total_withdrawn) - Number(wr.amount)
      }).eq("user_id", wr.user_id);

      await supabase.from("withdraw_requests").update({ 
        status: "rejected", 
        reject_reason: rejectReason 
      }).eq("id", id);
      
      await supabase.from("history").insert({
        user_id: wr.user_id, type: "withdraw_reject", description: `Çekim talebi reddedildi: ${rejectReason}`, amount: wr.amount
      });
    }

    return ok(res, { message: "Talep reddedildi" });
  } catch (e) {
    console.error(e);
    return err(res, "Sunucu hatası", 500);
  }
};