const { getUserFromReq, ok, err, cors, supabase } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") { cors(res); return res.status(200).end(); }
  try {
    const user = await getUserFromReq(req);
    if (!user) return err(res, "Oturum bulunamadı", 401);
    const { data: farm } = await supabase.from("farms").select("*").eq("user_id", user.id).single();
    return ok(res, {
      user: { id: user.id, name: user.name, phone: user.phone, avatar: user.avatar },
      farm
    });
  } catch (e) {
    console.error(e);
    return err(res, "Sunucu hatası", 500);
  }
};