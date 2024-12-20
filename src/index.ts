import { Hono } from "hono";
import { Client } from "@neondatabase/serverless";
import { env } from "hono/adapter";

const app = new Hono()

app.get("/test", async (c) => {
  console.log("Testing endpoint");
  return c.json({
    message: "Hello from cloudflare"
  }, 200);
})

app.post('/github/:id', async (c) => {
  const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);
  const client = new Client(DATABASE_URL);
  await client.connect();
  const { rows } = await client.query('SELECT * FROM books_to_read;');
  console.log(rows);
  return c.json({
    message: "Webhook delivery complete",
  }, 200);
});

/*
 * WebHook for the following things:
 * 1. Issue comments
 * 2. Labels (Label created, edited or deleted)
 * 3. Pull Request Reviews
 */

export default app

/* -- Bounty Manager
 * "/bounty 25 @IAmRiteshKoushik"
 */
