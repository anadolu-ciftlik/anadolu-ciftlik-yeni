const { bcrypt, ok, err, cors, signToken, ADMIN_USER, ADMIN_PASS } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") { cors(res); return res.status(200).end(); }
  if (req.method !== "POST") return err(res, "Method not allowed", 405);

  try {
    const { username, password } = req.body || {};
    if (username !== ADMIN_USER || password !== ADMIN_PASS) {
      return err(res, "Kullanıcı adı veya şifre hatalı", 401);
    }
    const token = signToken({ username, type: "admin" });
    return ok(res, { token });
  } catch (e) {
    console.error(e);
    return err(res, "Sunucu hatası", 500);
  }
};