const { supabase, bcrypt, ok, err, normalizePhone, signToken, ensureFarm, cors } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") { cors(res); return res.status(200).end(); }
  if (req.method !== "POST") return err(res, "Method not allowed", 405);

  try {
    const { phone: rawPhone, password } = req.body || {};
    const phone = normalizePhone(rawPhone);
    if (phone.length !== 10 || !password) return err(res, "Telefon ve şifre gerekli");

    const { data: user, error } = await supabase.from("users").select("*").eq("phone", phone).single();
    if (error || !user) return err(res, "Bu telefon numarası kayıtlı değil");

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return err(res, "Şifre hatalı");

    await ensureFarm(user.id);
    const token = signToken({ id: user.id, type: "user", phone: user.phone });
    return ok(res, {
      token,
      user: { id: user.id, name: user.name, phone: user.phone, avatar: user.avatar }
    });
  } catch (e) {
    console.error(e);
    return err(res, "Sunucu hatası", 500);
  }
};