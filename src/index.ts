import { Hono } from "hono";
import { Client } from "@neondatabase/serverless";
import { env } from "hono/adapter";

const app = new Hono()

app.get("/test", async (c) => {
  const body = await c.req.json();
  console.log(body);
  return c.json({
    message: "Hello from cloudflare"
  }, 200);
});

app.post('/github/:webhook', async (c) => {
  try {
    const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);
    const client = new Client(DATABASE_URL);
    await client.connect();

    // Fetch project idea and test for event type
    const { webhook } = c.req.param();
    const event = c.req.header('X-GitHub-Event');

    // Deserializing the entire payload
    const payload = await c.req.json();
    console.log(payload);

    switch (event) {
      // For onboarding repository, we can setup webhook for each one and 
      // populate the database for each project 
      case 'ping':
        try {
          const query = `INSERT INTO "Project" ("repoId", "webhook", "title") VALUES ($1, $2, $3)`;
          const values = [payload.repository.id, webhook, payload.repository.name];
          await client.query(query, values);
          return c.json({}, 200);
        } catch (error) {
          console.log(error);
          return c.json({}, 400);
        }
      case 'issues':
        // For handling issue comments of the type : 
        // 1. /bounty 50 @username
        // 2. /remove 50 @username
        try {

          return c.status(200); // Success
        } catch (error) {

        }
      case 'issue_comment':
        try {

          return c.status(200); // Success
        } catch (error) {

        }
      case 'pull_request':
        try {

          return c.status(200); // Success
        } catch (error) {

        }
      default:
        return c.status(200); // Success
    }
  } catch (error) {
    return c.json({
      message: "Internal Server Error",
    }, 500);
  }
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
