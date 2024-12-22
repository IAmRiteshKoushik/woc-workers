import { Hono } from "hono";
import { Client } from "@neondatabase/serverless";
import { env } from "hono/adapter";

const Hooks: Record<string, string[]> = {
  // QSE
  "c147g77m100009l2001": ['Abhinav-ark', 'Ashrockzzz2003'],
  // Amrita PYQ
  "c147g77m100009l2002": ['Abhinav-ark', 'Ashrockzzz2003', 'IAmRiteshKoushik'],
  // Amrita Map
  "c147g77m100009l2003": ['Abhinav-ark', 'Ashrockzzz2003'],
  // Match Da Pairs
  "c147g77m100009l2004": ['FirefoxSRV'],
  // Google Maps Kotlin Android
  "c147g77m100009l2005": ['Ashrockzzz2003'],
  // Placement Tracker Web
  "c147g77m100009l2006": ['Ashrockzzz2003', 'Abhinav-ark'],
  // Placement Tracker Server
  "c147g77m100009l2007": ['Ashrockzzz2003', 'Abhinav-ark'],
  // Data Structures and Algorithms
  "c147g77m100009l2008": ['Ashrockzzz2003', 'mdxaasil', 'VishalTheHuman'],
  // Bluedis
  "c147g77m100009l2009": ['IAmRiteshKoushik'],
  // Timetable CSEA
  "c147g77m100009l2010": ['Ashrockzzz2003', 'Abhinav-ark'],
  // Burntbrrota
  "c147g77m100009l2011": ['amri-tah'],
  // Leetpath
  "c147g77m100009l2012": ['amri-tah', 'VishalTheHuman'],
  // Burntbrrota Flutter
  "c147g77m100009l2013": ['amri-tah'],
  // Amrita GPT
  "c147g77m100009l2014": ['SaranDharshanSP', 'amri-tah'],
  // NeuroScribe
  "c147g77m100009l2015": ['SaranDharshanSP'],
  // TN Tourism
  "c147g77m100009l2016": ['SaranDharshanSP'],
}

const app = new Hono()

app.get("/test", async (c) => {
  return c.json({
    message: "Hello from cloudflare"
  }, 200);
});

app.post('/:webhook', async (c) => {
  try {
    const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);
    const client = new Client(DATABASE_URL);
    await client.connect();

    // Fetch project idea and test for event type
    const { webhook } = c.req.param();
    const event = c.req.header('X-GitHub-Event');

    if (event === undefined || webhook === undefined) {
      return c.json({
        message: "Forbidden Function Invocation"
      }, 403);
    }

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
          return c.json({}, 500);
        }


      /*
       * Issue labelling, unlabelling, assignment, closing, unassignment
       */
      case 'issues':
        const issueAction = payload.action;
        switch (issueAction) {
          // Insertion for labelling an issue as AMWOC
          case "labeled":
            const wocLabelAdded = payload.label.name === "AMWOC";
            if (wocLabelAdded !== true) {
              return c.json({
                message: "Label not relevant for WoC"
              }, 200);
            }
            try {
              const query = `INSERT INTO "Issue" ("issueId", "repoId", "url") VALUES($1, $2, $3)`;
              const values = [payload.issue.id, payload.repository.id, payload.issue.html_url];
              await client.query(query, values);
              return c.json({
                message: "Issue accepted for WoC"
              }, 200);
            } catch (error) {
              return c.json({
                messsage: "Internal Server Error"
              }, 500);
            }

          // Deletion for unlabelling an issue which was AMWOC
          case "unlabeled":
            const wocLabelRemoved = payload.label.name === "AMWOC";
            if (wocLabelRemoved !== true) {
              return c.json({
                message: "Label not relevant for WoC"
              }, 200);
            }
            try {
              const query = `DELETE FROM "Issue" WHERE "issueId" = $1`;
              const values = [payload.issue.id];
              await client.query(query, values);
              return c.json({
                message: "Issue removed from WoC"
              }, 200);
            } catch (error) {
              return c.json({
                message: "Internal Server Error",
              }, 500);
            }

          /* Issue has been assigned */
          case "assigned":
            try {
              await client.query("BEGIN");

              const checkQuery = `SELECT EXISTS(SELECT 1 from "Issue" WHERE "issueId" = $1)`;
              const checkResult = await client.query(checkQuery, [payload.issue.id]);

              if (!checkResult.rows[0].exists) {
                await client.query("COMMIT");
                return c.json({
                  message: "Issue has not been accepted for WoC"
                }, 200);
              }

              const updateQuery = `UPDATE "Issue" SET "claimedBy" = $1 WHERE "issueId" = $2`;
              const updateValues = [payload.issue.assignee.login, payload.issue.id];
              await client.query(updateQuery, updateValues);

              await client.query("COMMIT");

              return c.json({
                message: "Maintainer assigned an issue to " + payload.issue.assignee.login
              }, 200);
            } catch (error) {
              await client.query("ROLLBACK");
              console.log(error);
              return c.json({
                message: "Internal Server Error",
              }, 500);
            }
          /* Issue has been unassigned */
          case "unassigned":
            try {
              await client.query("BEGIN");

              const checkQuery = `SELECT EXISTS(SELECT 1 from "Issue" WHERE "issueId" = $1)`;
              const checkResult = await client.query(checkQuery, [payload.issue.id]);

              if (!checkResult.rows[0].exists) {
                await client.query("COMMIT");
                return c.json({
                  message: "Issue has not been accepted for WoC"
                }, 200);
              }

              const updateQuery = `UPDATE "Issue" SET "claimedBy" = NULL WHERE "issueId" = $1`;
              await client.query(updateQuery, [payload.issue.id]);
              await client.query("COMMIT");

              return c.json({
                message: "Maintainer unassigned an issue"
              }, 200);
            } catch (error) {
              await client.query("ROLLBACK");
              console.log(error);
              return c.json({
                message: "Internal Server Error",
              }, 500);
            }
          /* Issue has been closed (either completed or discarded) */
          case "closed":
            try {
              await client.query("BEGIN");

              const checkQuery = `SELECT EXISTS(SELECT 1 from "Issue" WHERE "issueId" = $1)`;
              const checkResult = await client.query(checkQuery, [payload.issue.id]);

              if (!checkResult.rows[0].exists) {
                await client.query("COMMIT");
                return c.json({}, 200);
              }

              const updateQuery = `UPDATE "Issue" SET "issueStatus" = false WHERE "issueId" = $1`;
              await client.query(updateQuery, [payload.issue.id]);
              await client.query("COMMIT");
              return c.json({
                message: "Maintainer closed issue"
              }, 200);
            } catch (error) {
              await client.query("ROLLBACK");
              console.log(error);
              return c.json({
                message: "Internal Server Error",
              }, 500);
            }

          /* Issue was re-opened after closing */
          case "reopened":
            try {
              await client.query("BEGIN");

              const checkQuery = `SELECT EXISTS(SELECT 1 from "Issue" WHERE "issueId" = $1)`;
              const checkResult = await client.query(checkQuery, [payload.issue.id]);

              if (!checkResult.rows[0].exists) {
                await client.query("COMMIT");
                return c.json({
                  message: "Maintainer re-opened issue"
                }, 200);
              }

              const updateQuery = `UPDATE "Issue" SET "issueStatus" = true, "claimedBy" = NULL WHERE "issueId" = $1`;
              await client.query(updateQuery, [payload.issue.id]);
              await client.query("COMMIT");
              return c.json({}, 200);
            } catch (error) {
              await client.query("ROLLBACK");
              console.log(error);
              return c.json({
                message: "Internal Server Error",
              }, 500);
            }
          default:
            return c.json({
              message: "Other Issue actions not handled"
            }, 200);
        }


      /*
       * All bounties are added to a BountyLog and to the Participant table itself
       */
      case 'issue_comment':
        const commentedBy = payload.comment.user.login;
        const isMaintainer = Hooks[webhook].indexOf(commentedBy) !== -1;
        if (!isMaintainer) {
          return c.json({
            message: "Not a maintainer action"
          }, 200);
        }

        const issueCommentAction = payload.action;
        switch (issueCommentAction) {
          // Creating and editing comments both fall under the same category
          case "edited":
          case "created":
            const body = payload.comment.body.trim().split(" ");
            // Irrelevant comment
            if (body.length !== 3) {
              return c.json({
                message: "Maintainer action irrelevant"
              }, 200);
            }
            /* Adding bounty */
            if (body[0] === "/bounty") {
              const point = body[1];
              const participant = body[2].substring(1); // removing the @ symbol

              try {
                await client.query("BEGIN");

                // Update bounty log table
                const logQuery = `INSERT INTO "BountyLog" ("givenBy", "amount", "givenTo") VALUES ($1, $2, $3)`;
                const logValues = [commentedBy, parseInt(point), participant];
                await client.query(logQuery, logValues);

                // Award bounty to participant
                const bountyQuery = `UPDATE "Participant" SET "bounty" = "bounty" + $1 WHERE "username" = $2`;
                const bountyValues = [parseInt(point), participant];
                await client.query(bountyQuery, bountyValues);

                await client.query("COMMIT");
                return c.json({
                  message: "Bounty added by maintainer"
                }, 200);
              } catch (error) {
                await client.query("ROLLBACK");
                console.log(error);
                return c.json({
                  message: "Internal Server Error"
                }, 500);
              }
            }
            /* Removing a bounty */
            else if (body[0] === "/remove") {
              const point = body[1];
              const participant = body[2].substring(1); // removing the @ symbol

              try {
                await client.query("BEGIN");

                // Update bounty log table
                const logQuery = `INSERT INTO "BountyLog" ("givenBy", "amount", "givenTo") VALUES ($1, $2, $3)`;
                const logValues = [commentedBy, -1 * parseInt(point), participant];
                await client.query(logQuery, logValues);

                // Remove bounty from participant
                const bountyQuery = `UPDATE "Participant" SET "bounty" = "bounty" + $1 WHERE "username" = $2`;
                const bountyValues = [-1 * parseInt(point), participant];
                await client.query(bountyQuery, bountyValues);

                await client.query("COMMIT");
                return c.json({
                  message: "Bounty removed by maintainer"
                }, 200);
              } catch (error) {
                await client.query("ROLLBACK");
                console.log(error);
                return c.json({
                  message: "Internal Server Error"
                }, 500);
              }
            }
            // Comment irrelevant
            else {
              return c.json({
                message: "Maintainer action irrelevant"
              }, 200);
            }
          default:
            break
        }

      /* 
       * Pull Request are going to go into the Solution table where they 
       * are only concerned with the tag "AMWOC-accepted" 
       * */
      case 'pull_request':
        const prAction = payload.action;
        const isValidLabel = payload.label.name === "AMWOC-accepted";
        if (!isValidLabel) {
          return c.json({
            message: "Not a AMWOC Pull Request"
          }, 200);
        }

        // Insertion and Deletion will happen based on id
        const id = payload.pull_request.id;

        switch (prAction) {
          case "labeled":
            const username = payload.pull_request.user.login;
            const repoId = payload.repository.id;
            const url = payload.pull_request.html_url;
            try {
              const query = `INSERT INTO "Solution" ("id", "repoId", "username", "url") VALUES ($1, $2, $3, $4)`;
              const values = [id, repoId, username, url];
              await client.query(query, values);

              return c.json({
                message: "PR labelled by maintainer"
              }, 200);
            } catch (error) {
              console.log(error);
              return c.json({
                message: "Internal Server Error"
              }, 500);
            }
          case "unlabeled":
            try {
              const query = `DELETE FROM "Solution" WHERE "id" = $1`;
              await client.query(query, [id]);

              return c.json({
                message: "PR unlabelled by maintainer"
              }, 200);
            } catch (error) {
              console.log(error);
              return c.json({
                message: "Internal Server Error"
              }, 500);
            }
          default:
            return c.json({
              message: "Only labelling and unlabelling actions handled for PR"
            }, 200)
        }
      default:
        return c.json({}, 200); // Success
    }
  } catch (error) {
    return c.json({
      message: "No mechanism to handle this event",
    }, 500);
  }
});

export default app
