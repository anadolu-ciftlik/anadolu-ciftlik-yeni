const { supabase, getUserFromReq, ok, err, cors } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") { cors(res); return res.status(200).end(); }
  try {
    const user = await getUserFromReq(req);
    if (!user) return err(res, "Oturum bulunamadı", 401);

    const { data, error } = await supabase
      .from("support_tickets")
      .select("*, support_replies(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return err(res, error.message);
    return ok(res, { tickets: data || [] });
  } catch (e) {
    console.error(e);
    return err(res, "Sunucu hatası", 500);
  }
};