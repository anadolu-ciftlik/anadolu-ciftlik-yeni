const { supabase, bcrypt, ok, err, normalizePhone, signToken, ensureFarm, cors } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") { cors(res); return res.status(200).end(); }
  if (req.method !== "POST") return err(res, "Method not allowed", 405);

  try {
    const { name, phone: rawPhone, password, avatar } = req.body || {};
    const phone = normalizePhone(rawPhone);

    if (!name || name.trim().length < 3) return err(res, "Ad soyad en az 3 karakter olmalı");
    if (phone.length !== 10) return err(res, "Geçerli bir telefon girin");
    if (!password || password.length < 4) return err(res, "Şifre en az 4 karakter olmalı");

    const { data: existing } = await supabase.from("users").select("id").eq("phone", phone).single();
    if (existing) return err(res, "Bu telefon numarası zaten kayıtlı");

    const password_hash = await bcrypt.hash(password, 10);
    const { data: user, error } = await supabase
      .from("users")
      .insert({ name: name.trim(), phone, password_hash, avatar: avatar || "🐄" })
      .select()
      .single();
    if (error) return err(res, error.message);

    await ensureFarm(user.id);
    const token = signToken({ id: user.id, type: "user", phone: user.phone });
    return ok(res, {
      token,
      user: { id: user.id, name: user.name, phone: user.phone, avatar: user.avatar }
    });
  } catch (e) {
    console.error(e);
    return err(res, "Sunucu hatası: " + e.message, 500);
  }
};