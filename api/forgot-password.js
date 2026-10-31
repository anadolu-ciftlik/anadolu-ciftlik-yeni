const { supabase, bcrypt, ok, err, cors, normalizePhone } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") { cors(res); return res.status(200).end(); }
  if (req.method !== "POST") return err(res, "Method not allowed", 405);

  try {
    const { phone: rawPhone } = req.body || {};
    const phone = normalizePhone(rawPhone);
    if (phone.length !== 10) return err(res, "Geçerli bir telefon girin");

    const { data: user } = await supabase.from("users").select("id").eq("phone", phone).single();
    if (!user) return err(res, "Bu telefon numarası kayıtlı değil");

    // Geçici şifre üret
    const tempPassword = "TR" + Math.floor(1000 + Math.random() * 9000);
    const password_hash = await bcrypt.hash(tempPassword, 10);
    await supabase.from("users").update({ password_hash }).eq("id", user.id);

    return ok(res, { tempPassword, message: "Geçici şifre oluşturuldu" });
  } catch (e) {
    console.error(e);
    return err(res, "Sunucu hatası", 500);
  }
};