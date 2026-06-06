const { Client } = require("pg");

const client = new Client({
  connectionString: "postgresql://postgres:root@localhost:5432/LMSHUB"
});

async function check() {
  try {
    await client.connect();

    // Check if is_edited / is_pinned columns have NOT NULL but no default — this can cause Hibernate INSERT failures
    console.log("--- is_edited / is_pinned constraints ---");
    const res = await client.query(`
      SELECT column_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'messages' 
        AND column_name IN ('is_edited', 'is_pinned', 'parent_id', 'attachment_url', 'attachment_type')
      AND table_schema = 'public'
    `);
    res.rows.forEach(r => console.log(r));

    // Try to INSERT a message to see if it works
    console.log("\n--- Testing message INSERT ---");
    
    // Get a real user first
    const userRes = await client.query("SELECT id FROM users LIMIT 1");
    const userId = userRes.rows[0]?.id;
    if (!userId) { console.log("No users found!"); return; }
    console.log("Using sender:", userId);

    try {
      const msgRes = await client.query(`
        INSERT INTO messages (id, sender_id, subject, content, is_read, type, sent_at, is_edited, is_pinned)
        VALUES (gen_random_uuid(), $1, 'Test Subject', 'Test Content', false, 'DIRECT', NOW(), false, false)
        RETURNING id
      `, [userId]);
      console.log("INSERT OK:", msgRes.rows[0]);
      await client.query("DELETE FROM messages WHERE subject = 'Test Subject'");
    } catch (e) {
      console.error("INSERT ERROR:", e.message);
    }

  } catch (err) {
    console.error("Connection error:", err.message);
  } finally {
    await client.end();
  }
}

check();
