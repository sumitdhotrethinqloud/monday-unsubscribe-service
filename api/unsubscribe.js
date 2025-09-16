import axios from "axios";

const MONDAY_API_TOKEN = process.env.MONDAY_TOKEN;
const BOARD_ID = process.env.BOARD_ID;
const COL_TOKEN_ID = process.env.COL_TOKEN_ID;
const COL_MARKETING_ID = process.env.COL_MARKETING_ID;
const COL_NEWSLETTER_ID = process.env.COL_NEWSLETTER_ID;
const COL_LAST_UNSUB_ID = process.env.COL_LAST_UNSUB_ID;

async function mondayQuery(query, variables = {}) {
  const res = await axios.post(
    "https://api.monday.com/v2",
    { query, variables },
    { headers: { Authorization: MONDAY_API_TOKEN, "Content-Type": "application/json" } }
  );
  return res.data;
}

export default async function handler(req, res) {
  const { token, type } = req.query;

  if (!token) {
    return res.status(400).json({ success: false, message: "Missing token" });
  }

  try {
    // 1. Find item by token
    const query = `
      query findItem($boardId: ID!, $columnId: String!, $token: String!) {
        items_page(board_id: $boardId, limit: 100) {
          items {
            id
            name
            column_values(ids: [$columnId]) {
              id
              text
            }
          }
        }
      }
    `;
    const data = await mondayQuery(query, {
      boardId: BOARD_ID,
      columnId: COL_TOKEN_ID,
      token,
    });

    const item = data.data.items_page.items.find(
      i => i.column_values[0]?.text === token
    );

    if (!item) {
      return res.status(404).json({ success: false, message: "Invalid token" });
    }

    // 2. Decide updates
    let updates = {};
    if (type === "marketing" || type === "both") {
      updates[COL_MARKETING_ID] = { label: "Unsubscribed" };
    }
    if (type === "newsletters" || type === "both") {
      updates[COL_NEWSLETTER_ID] = { label: "Unsubscribed" };
    }
    updates[COL_LAST_UNSUB_ID] = new Date().toISOString();

    // 3. Push update
    const mutation = `
      mutation updateColumns($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
        change_multiple_column_values(
          board_id: $boardId,
          item_id: $itemId,
          column_values: $columnValues
        ) {
          id
        }
      }
    `;
    await mondayQuery(mutation, {
      boardId: BOARD_ID,
      itemId: item.id,
      columnValues: JSON.stringify(updates),
    });

    return res.json({ success: true, message: "Unsubscribed successfully" });
  } catch (err) {
    console.error("Unsubscribe error", err.response?.data || err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
