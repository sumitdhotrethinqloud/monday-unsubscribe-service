// pages/api/generate-token.js
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ success: false, message: "Method not allowed" });
    }

// 🔹 Handle webhook verification challenge
    if (req.body && req.body.challenge) {
      console.log("🔑 Responding to Monday webhook challenge");
     // return res.status(200).send(req.body.challenge);
	 
  res.setHeader("Content-Type", "text/plain");
  return res.status(200).send(req.body.challenge);
}

    
	
    console.log("📥 Incoming webhook payload:", req.body);

    const { event } = req.body;
    if (!event || !event.itemId || !event.boardId) {
      return res.status(400).json({ success: false, message: "Invalid webhook payload" });
    }

    const itemId = event.itemId;
    const boardId = event.boardId;
	const MONDAY_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjUzNjE2MDE3MCwiYWFpIjoxMSwidWlkIjo3NjkyMjQ3MCwiaWFkIjoiMjAyNS0wNy0wOFQwODo1ODoyNC4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MjY5NDU4NjMsInJnbiI6ImFwc2UyIn0.T8F8CgM45kPUl4SJKtEr1jjrUGQJQAbY1q3YFNmypIY";

    const token = uuidv4();

    const query = `
      mutation update_column($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
        change_column_value(board_id: $boardId, item_id: $itemId, column_id: $columnId, value: $value) {
          id
        }
      }
    `;

    const variables = {
      boardId,
      itemId,
      columnId: "text_mkvtvmk9", // token column
      value: JSON.stringify(token),
    };

    const response = await axios.post(
      "https://api.monday.com/v2",
      { query, variables },
      { headers: { Authorization: `Bearer ${MONDAY_TOKEN}` } }
    );

    console.log("📤 Monday response:", response.data);

    return res.status(200).json({
      success: true,
      message: "Token generated and updated",
      token,
    });
  } catch (err) {
    console.error("❌ Error:", err.message, err.stack);
    return res.status(500).json({ success: false, message: err.message });
  }
}
