import axios from "axios";

export default async function handler(req, res) {
  try {
    const { token, type } = req.query;

    if (!token) {
      return res.status(400).json({ success: false, error: "Missing token" });
    }

    const MONDAY_TOKEN = process.env.MONDAY_TOKEN;
    const BOARD_ID = process.env.BOARD_ID;
    const COL_TOKEN_ID = process.env.COL_TOKEN_ID;
    const COL_MARKETING_ID = process.env.COL_MARKETING_ID;
    const COL_NEWSLETTER_ID = process.env.COL_NEWSLETTER_ID;
    const COL_LAST_UNSUB_ID = process.env.COL_LAST_UNSUB_ID;

    // 1. Find item by token
    const query = `
      query ($boardId: ID!) {
        boards (ids: [$boardId]) {
          items_page {
            items {
              id
              column_values {
                id
                text
              }
            }
          }
        }
      }
    `;

    const response = await axios.post(
      "https://api.monday.com/v2",
      { query, variables: { boardId: BOARD_ID } },
      { headers: { Authorization: MONDAY_TOKEN } }
    );

    const items = response.data.data.boards[0].items_page.items;
    const item = items.find(i =>
      i.column_values.some(cv => cv.id === COL_TOKEN_ID && cv.text === token)
    );

    if (!item) {
      return res.status(404).json({ success: false, error: "Invalid or expired link" });
    }

    // 2. Prepare column updates
    let changes = {};
    if (type === "marketing") changes[COL_MARKETING_ID] = { label: "Unsubscribed" };
    if (type === "newsletter") changes[COL_NEWSLETTER_ID] = { label: "Unsubscribed" };
    if (type === "both") {
      changes[COL_MARKETING_ID] = { label: "Unsubscribed" };
      changes[COL_NEWSLETTER_ID] = { label: "Unsubscribed" };
    }
    changes[COL_LAST_UNSUB_ID] = new Date().toISOString();

    const mutation = `
      mutation ($itemId: Int!, $boardId: ID!, $columnValues: JSON!) {
        change_multiple_column_values(item_id: $itemId, board_id: $boardId, column_values: $columnValues) {
          id
        }
      }
    `;

    await axios.post(
      "https://api.monday.com/v2",
      {
        query: mutation,
        variables: {
          itemId: parseInt(item.id, 10),
          boardId: BOARD_ID,
          columnValues: JSON.stringify(changes),
        },
      },
      { headers: { Authorization: MONDAY_TOKEN } }
    );

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Unsubscribe API error:", err.response?.data || err.message);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}
