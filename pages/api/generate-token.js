// pages/api/generate-token.js
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

const MONDAY_API = "https://api.monday.com/v2";

/**
 * POST handler expected JSON body:
 * { "itemId": "123456", "boardId": "2072738911", "secret": "optional" }
 *
 * Or Monday automation can POST { "itemId": "{pulse.id}" } (use placeholder)
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const body = req.body || {};
    const itemId = body.itemId || body.pulseId || body.pulse?.id || body.data?.pulseId;
    const boardId = body.boardId || "2072738911";
    const incomingSecret = body.secret || req.query.secret || req.headers["x-webhook-secret"];

    // optional: verify webhook secret
    if (process.env.WEBHOOK_SECRET) {
      if (!incomingSecret || incomingSecret !== process.env.WEBHOOK_SECRET) {
        console.warn("Webhook secret mismatch", { incomingSecret });
        return res.status(403).json({ success: false, message: "Invalid webhook secret" });
      }
    }

    if (!itemId) {
      return res.status(400).json({ success: false, message: "Missing itemId in body" });
    }

    // env vars (token column id etc.)
    const MONDAY_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjUzNjE2MDE3MCwiYWFpIjoxMSwidWlkIjo3NjkyMjQ3MCwiaWFkIjoiMjAyNS0wNy0wOFQwODo1ODoyNC4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MjY5NDU4NjMsInJnbiI6ImFwc2UyIn0.T8F8CgM45kPUl4SJKtEr1jjrUGQJQAbY1q3YFNmypIY";
    const BOARD_ID = "2072738911";
    const COL_TOKEN_ID = "text_mkvtvmk9"; // e.g. text_mkvtvmk9
    const COL_LAST_UNSUB_ID = null; // optional

    if (!MONDAY_TOKEN || !COL_TOKEN_ID || !boardId) {
      return res.status(500).json({ success: false, message: "Server not configured (missing env vars)" });
    }

    const headers = { Authorization: `Bearer ${MONDAY_TOKEN}`, "Content-Type": "application/json" };

    // 1) Read current token value for the item (if any)
    const getQuery = `
      query ($itemIds: [ID!]!) {
        items (ids: $itemIds) {
          id
          column_values {
            id
            text
          }
        }
      }
    `;
    const getResp = await axios.post(MONDAY_API, { query: getQuery, variables: { itemIds: [String(itemId)] } }, { headers });
    const items = getResp.data?.data?.items || [];
    if (!items.length) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }
    const item = items[0];

    const tokenColumn = item.column_values.find((c) => c.id === COL_TOKEN_ID);
    if (tokenColumn && tokenColumn.text) {
      // already has token — return it (idempotent)
      return res.status(200).json({ success: true, message: "Token already exists", token: tokenColumn.text, itemId: item.id });
    }

    // 2) Generate token and save
    const token = uuidv4();

    const updates = { [COL_TOKEN_ID]: token };
    // optional: set last created date (if you want)
    if (COL_LAST_UNSUB_ID) {
      updates[COL_LAST_UNSUB_ID] = new Date().toISOString().slice(0, 10);
    }

    const mutation = `
      mutation ($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
        change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $columnValues) {
          id
        }
      }
    `;

    const mutResp = await axios.post(MONDAY_API, {
      query: mutation,
      variables: {
        boardId: boardId,
        itemId: String(item.id),
        columnValues: JSON.stringify(updates),
      },
    }, { headers });

    if (mutResp.data?.errors) {
      console.error("monday mutation errors", mutResp.data.errors);
      return res.status(500).json({ success: false, message: "Monday API error", errors: mutResp.data.errors });
    }

    return res.status(200).json({ success: true, message: "Token generated", token, itemId: item.id });
  } catch (err) {
    console.error("generate-token error:", err.response?.data || err.message);
    return res.status(500).json({ success: false, message: err.response?.data || err.message });
  }
}
