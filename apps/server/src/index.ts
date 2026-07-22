import { createApp } from "./app.js";
import { getDb } from "./db.js";

const PORT = Number(process.env.PORT ?? 4000);

// Ensure the DB (and schema) exist before serving.
getDb();

createApp().listen(PORT, () => {
  console.log(`[server] internal-tools-platform API listening on :${PORT}`);
});
