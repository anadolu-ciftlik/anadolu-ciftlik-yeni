const { supabase, getAdminFromReq, ok, err, cors } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") { cors(res); return res.status(200).end(); }
  try {
    const admin = await getAdminFromReq(req);
    if (!admin) return err(res, "Yetkisiz", 401);

    const [usersRes, farmsRes, loadsRes, withdrawsRes, ticketsRes, animalsRes] = await Promise.all([
      supabase.from("users").select("id, name, phone, avatar, created_at"),
      supabase.from("farms").select("*"),
      supabase.from("load_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("withdraw_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("support_tickets").select("*, support_replies(*)").order("created_at", { ascending: false }),
      supabase.from("animals").select("user_id, type, age_seconds")
    ]);

    const users = usersRes.data || [];
    const farms = farmsRes.data || [];
    const userMap = {};
    users.forEach(u => { userMap[u.id] = u; });

    // kullanıcı başına farm
    const farmMap = {};
    farms.forEach(f => { farmMap[f.user_id] = f; });

    // hayvan sayıları
    const animalMap = {};
    (animalsRes.data || []).forEach(a => {
      if (!animalMap[a.user_id]) animalMap[a.user_id] = { total: 0, alive: 0 };
      animalMap[a.user_id].total++;
      if (Number(a.age_seconds) < 86400 * 30) animalMap[a.user_id].alive++;
    });

    const enrichedUsers = users.map(u => ({
      ...u,
      farm: farmMap[u.id] || null,
      animals: animalMap[u.id] || { total: 0, alive: 0 }
    }));

    const enrichedLoads = (loadsRes.data || []).map(l => ({
      ...l,
      user: userMap[l.user_id] || null,
      type: "load"
    }));
    const enrichedWithdraws = (withdrawsRes.data || []).map(w => ({
      ...w,
      user: userMap[w.user_id] || null,
      type: "withdraw"
    }));
    const enrichedTickets = (ticketsRes.data || []).map(t => ({
      ...t,
      user: userMap[t.user_id] || null
    }));

    return ok(res, {
      users: enrichedUsers,
      loads: enrichedLoads,
      withdraws: enrichedWithdraws,
      tickets: enrichedTickets
    });
  } catch (e) {
    console.error(e);
    return err(res, "Sunucu hatası", 500);
  }
};