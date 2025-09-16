// api/unsubscribe.js
import axios from "axios";

export default async function handler(req, res) {
  const { token, type } = req.query;

  if (!token) {
    return res.status(400).json({ success: false, message: "Missing token" });
  }

  try {
    // 📝 Log environment variable
    console.log("🔑 MONDAY_TOKEN from env:", process.env.MONDAY_TOKEN?.slice(0, 20) + "...");

    // 📝 Log request details
    console.log("➡️ Incoming unsubscribe request:", { token, type });

    // Example GraphQL mutation
    const query = `
      mutation update_column($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
        change_column_value(board_id: $boardId, item_id: $itemId, column_id: $columnId, value: $value) {
          id
        }
      }
    `;

    // Replace with actual itemId resolution logic (simplified here)
    const variables = {
      boardId: process.env.BOARD_ID,
      itemId: 2072738917, // placeholder, update with lookup by email/token
      columnId: type === "marketing" ? process.env.COL_MARKETING_ID : process.env.COL_NEWSLETTER_ID,
      value: JSON.stringify({ label: "Unsubscribed" }),
    };

    // 📝 Log outgoing request
    console.log("📤 Sending request to Monday API with variables:", variables);

    const response = await axios.post(
      "https://api.monday.com/v2",
      { query, variables },
      {
        headers: {
          Authorization: process.env.MONDAY_TOKEN,
        },
      }
    );

    // 📝 Log Monday response
    console.log("📥 Monday API response:", JSON.stringify(response.data, null, 2));

    if (response.data.errors) {
      return res.status(500).json({ success: false, message: "Monday API error", errors: response.data.errors });
    }

    return res.status(200).json({ success: true, message: "Unsubscribed successfully" });
  } catch (err) {
    console.error("❌ Error in unsubscribe handler:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
