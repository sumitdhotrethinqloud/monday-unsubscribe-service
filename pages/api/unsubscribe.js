// pages/api/unsubscribe.js
import axios from "axios";

export default async function handler(req, res) {
  const { token, type } = req.query;

  if (!token || !type) {
    return res.status(400).json({ success: false, message: "Missing token or type" });
  }

  try {
    console.log("➡️ Incoming unsubscribe request:", { token, type });

    // Hardcoded values (replace with env after testing)
    const MONDAY_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjUzNjE2MDE3MCwiYWFpIjoxMSwidWlkIjo3NjkyMjQ3MCwiaWFkIjoiMjAyNS0wNy0wOFQwODo1ODoyNC4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MjY5NDU4NjMsInJnbiI6ImFwc2UyIn0.T8F8CgM45kPUl4SJKtEr1jjrUGQJQAbY1q3YFNmypIY";
    const BOARD_ID = "2072738911";
    //const COL_TOKEN_ID = "text_mkvtvmk9";
	const COL_TOKEN_ID = "pulse_id_mkvyc8ca",
    const COL_MARKETING_ID = "color_mkvpcgta";
    const COL_NEWSLETTER_ID = "color_mkvp9p80";

    // 1. Find item by token
    const findQuery = `
      query ($boardId: ID!, $columnId: String!, $token: String!) {
        items_page_by_column_values (
          board_id: $boardId,
          columns: [{column_id: $columnId, column_values: [$token]}],
          limit: 1
        ) {
          items { id name }
        }
      }
    `;

    const findRes = await axios.post(
      "https://api.monday.com/v2",
      {
        query: findQuery,
        variables: { boardId: BOARD_ID, columnId: COL_TOKEN_ID, token },
      },
      { headers: { Authorization: `Bearer ${MONDAY_TOKEN}` } }
    );

    console.log("📥 Find response:", JSON.stringify(findRes.data, null, 2));

    const items = findRes.data.data?.items_page_by_column_values?.items || [];
    if (items.length === 0) {
      return res.status(404).json({ success: false, message: "Token not found in board" });
    }

    const itemId = items[0].id;

    // 2. Build column updates
    let updates = {};
    if (type === "marketing") {
      updates[COL_MARKETING_ID] = { label: "Unsubscribed" };
    } else if (type === "newsletter") {
      updates[COL_NEWSLETTER_ID] = { label: "Unsubscribed" };
    } else if (type === "both") {
      updates[COL_MARKETING_ID] = { label: "Unsubscribed" };
      updates[COL_NEWSLETTER_ID] = { label: "Unsubscribed" };
    } else {
      return res.status(400).json({ success: false, message: "Invalid type" });
    }

    // 3. Update via mutation
    const updateQuery = `
      mutation ($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
        change_multiple_column_values(
          board_id: $boardId,
          item_id: $itemId,
          column_values: $columnValues
        ) {
          id
        }
      }
    `;

    const updateRes = await axios.post(
      "https://api.monday.com/v2",
      {
        query: updateQuery,
        variables: {
          boardId: BOARD_ID,
          itemId,
          columnValues: JSON.stringify(updates),
        },
      },
      { headers: { Authorization: `Bearer ${MONDAY_TOKEN}` } }
    );

    console.log("📥 Update response:", JSON.stringify(updateRes.data, null, 2));

    if (updateRes.data.errors) {
      return res.status(500).json({
        success: false,
        message: "Monday API error",
        errors: updateRes.data.errors,
      });
    }

    return res.status(200).json({ success: true, message: "Unsubscribed successfully" });
  } catch (err) {
    console.error("❌ Error in unsubscribe handler:", err.message, err.stack);
    return res.status(500).json({ success: false, message: err.message });
  }
}
