const { supabase, getAdminFromReq, ok, err, cors } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") { cors(res); return res.status(200).end(); }

  try {
    const admin = await getAdminFromReq(req);
    if (!admin) return err(res, "Yetkisiz", 401);

    const { data, error } = await supabase
      .from("support_tickets")
      .select("*, users(name, phone), support_replies(*)")
      .order("created_at", { ascending: false });

    if (error) return err(res, error.message);

    return ok(res, { tickets: data });
  } catch (e) {
    console.error(e);
    return err(res, "Sunucu hatası", 500);
  }
};