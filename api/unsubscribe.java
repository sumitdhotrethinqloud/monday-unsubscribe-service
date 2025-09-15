// api/unsubscribe.js
import axios from "axios";

const MONDAY_API = "https://api.monday.com/v2";
const MONDAY_TOKEN = process.env.MONDAY_TOKEN;
const BOARD_ID = Number(process.env.BOARD_ID);

// Column IDs (string ids, not titles) - set these in .env
const COL_TOKEN = process.env.COL_TOKEN_ID;         // Unsubscribe Token column
const COL_EMAIL = process.env.COL_EMAIL_ID;         // Email column
const COL_MARKETING = process.env.COL_MARKETING_ID; // Marketing subscription column
const COL_NEWSLETTER = process.env.COL_NEWSLETTER_ID; // Newsletter subscription column
const COL_LAST_UNSUB = process.env.COL_LAST_UNSUB_ID || null; // optional date column

async function mondayQuery(query, variables) {
  const r = await axios.post(
    MONDAY_API,
    { query, variables },
    { headers: { Authorization: MONDAY_TOKEN, "Content-Type": "application/json" } }
  );
  if (r.data.errors) throw new Error(JSON.stringify(r.data.errors));
  return r.data.data;
}

async function findItemsByColumn(columnId, value) {
  const q = `query ($boardId:Int!, $col:String!, $val:String!) {
    items_by_column_values(board_id:$boardId, column_id:$col, column_value:$val) {
      id
      name
    }
  }`;
  const data = await mondayQuery(q, { boardId: BOARD_ID, col: columnId, val: value });
  return data.items_by_column_values || [];
}

async function updateItemColumns(itemId, updatesObj) {
  const colValuesStr = JSON.stringify(updatesObj).replace(/"/g, '\\"');
  const mutation = `mutation {
    change_multiple_column_values(board_id: ${BOARD_ID}, item_id: ${itemId}, column_values: "${colValuesStr}") {
      id
    }
  }`;
  await mondayQuery(mutation);
}

// Render unsubscribe selection form (GET)
function renderFormPage(tokenOrEmail) {
  const tokenInput = `<input type="hidden" name="token" value="${escapeHtml(tokenOrEmail)}" />`;
  return `<!doctype html>
  <html>
  <head><meta charset="utf-8"><title>Unsubscribe</title></head>
  <body>
    <h1>Manage Email Preferences</h1>
    <p>Select which emails you want to unsubscribe from:</p>
    <form method="POST" action="">
      ${tokenInput}
      <label><input type="radio" name="type" value="Marketing" required> Unsubscribe from Marketing</label><br/>
      <label><input type="radio" name="type" value="Newsletters" required> Unsubscribe from Newsletters</label><br/>
      <label><input type="radio" name="type" value="Both" required> Unsubscribe from Both</label><br/>
      <br/>
      <button type="submit">Submit</button>
    </form>
  </body>
  </html>`;
}

function renderSuccessPage(type) {
  return `<!doctype html>
  <html>
  <head><meta charset="utf-8"><title>Unsubscribed</title></head>
  <body>
    <h1>You're unsubscribed</h1>
    <p>You have been unsubscribed from: <strong>${escapeHtml(type)}</strong>.</p>
  </body>
  </html>`;
}

function escapeHtml(s = "") {
  return String(s).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}

export default async function handler(req, res) {
  try {
    if (!MONDAY_TOKEN || !BOARD_ID || !COL_TOKEN || !COL_EMAIL || !COL_MARKETING || !COL_NEWSLETTER) {
      res.status(500).send("Server not configured. Set env vars.");
      return;
    }

    if (req.method === "GET") {
      // Show form. Accept token OR email param.
      const token = req.query.token || "";
      const email = req.query.email || "";
      if (!token && !email) {
        res.status(400).send("Missing token or email.");
        return;
      }
      const hiddenVal = token || email;
      res.setHeader("Content-Type", "text/html");
      res.status(200).send(renderFormPage(hiddenVal));
      return;
    }

    if (req.method === "POST") {
      const body = req.body || {};
      const token = body.token || req.query.token;
      const email = body.email || req.query.email;
      const type = body.type || req.query.type;
      if (!type || (!token && !email)) {
        res.status(400).send("Missing required parameters.");
        return;
      }

      // find item(s) by token (preferred) or email
      let items = [];
      if (token) {
        items = await findItemsByColumn(COL_TOKEN, token);
      } else {
        items = await findItemsByColumn(COL_EMAIL, email);
      }
      if (!items.length) {
        res.status(404).send("No matching record found.");
        return;
      }

      const updates = {};
      const today = new Date().toISOString().slice(0, 10);

      if (type === "Marketing" || type === "Both") {
        updates[COL_MARKETING] = { label: "Unsubscribed" };
      }
      if (type === "Newsletters" || type === "Both") {
        updates[COL_NEWSLETTER] = { label: "Unsubscribed" };
      }
      if (COL_LAST_UNSUB) {
        updates[COL_LAST_UNSUB] = { date: today };
      }

      for (const it of items) {
        await updateItemColumns(Number(it.id), updates);
      }

      res.setHeader("Content-Type", "text/html");
      res.status(200).send(renderSuccessPage(type));
      return;
    }

    res.status(405).send("Method not allowed.");
  } catch (err) {
    console.error(err.message || err);
    res.status(500).send("Internal error: " + (err.message || JSON.stringify(err)));
  }
}
