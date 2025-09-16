import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

dotenv.config();

const MONDAY_API_TOKEN = process.env.MONDAY_API_TOKEN;
const BOARD_ID = process.env.BOARD_ID;
const TOKEN_COLUMN_ID = "unsubscribe_token"; // <-- replace with your column ID

async function mondayQuery(query, variables = {}) {
  const res = await axios.post(
    "https://api.monday.com/v2",
    { query, variables },
    { headers: { Authorization: MONDAY_API_TOKEN, "Content-Type": "application/json" } }
  );
  return res.data;
}

async function generateTokens() {
  // 1. Fetch items
  const query = `
    query getBoardItems($boardId: ID!) {
      boards(ids: [$boardId]) {
        items_page(limit: 100) {
          items {
            id
            name
            column_values {
              id
              text
            }
          }
        }
      }
    }
  `;
  const data = await mondayQuery(query, { boardId: BOARD_ID });

  const items = data.boards[0].items_page.items;

  for (const item of items) {
    const tokenColumn = item.column_values.find(c => c.id === TOKEN_COLUMN_ID);

    if (!tokenColumn?.text) {
      // 2. Generate token
      const token = uuidv4();

      // 3. Save token to monday column
      const mutation = `
        mutation assignToken($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
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
        columnValues: JSON.stringify({
          [TOKEN_COLUMN_ID]: token,
        }),
      });

      console.log(`✅ Assigned token to ${item.name}: ${token}`);
    }
  }
}

generateTokens().catch(err => console.error(err));
