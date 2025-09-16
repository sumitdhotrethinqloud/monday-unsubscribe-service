import axios from "axios";

export default async function handler(req, res) {
  const { token, type } = req.query;

  if (!token || !type) {
    return res.status(400).json({ success: false, message: "Missing token or type" });
  }

  try {
    // 🔑 Fetch env vars from Vercel
    const apiToken = process.env.MONDAY_API_TOKEN;
    const boardId = process.env.BOARD_ID;

    // Example: decode token (in reality, you’d store mapping in monday column)
    // For now assume token is the itemId
    const itemId = token;

    // Decide which columns to update
    const columnValues = {};
    if (type === "marketing") {
      columnValues["marketing"] = { label: "Unsubscribed" };
    } else if (type === "newsletters") {
      columnValues["newsletters"] = { label: "Unsubscribed" };
    } else if (type === "both") {
      columnValues["marketing"] = { label: "Unsubscribed" };
      columnValues["newsletters"] = { label: "Unsubscribed" };
    }

    const mutation = `
      mutation change($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
        change_multiple_column_values(
          board_id: $boardId,
          item_id: $itemId,
          column_values: $columnValues
        ) {
          id
        }
      }
    `;

    const response = await axios.post(
      "https://api.monday.com/v2",
      {
        query: mutation,
        variables: {
          boardId,
          itemId,
          columnValues: JSON.stringify(columnValues),
        },
      },
      {
        headers: {
          Authorization: apiToken,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data.errors) {
      return res.status(500).json({ success: false, message: "Monday API error", errors: response.data.errors });
    }

    return res.status(200).json({ success: true, message: `Unsubscribed from ${type}` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
