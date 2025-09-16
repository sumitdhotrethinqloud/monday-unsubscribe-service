import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

dotenv.config();

const MONDAY_API_TOKEN = process.env.MONDAY_TOKEN;
const BOARD_ID = process.env.BOARD_ID;
const TOKEN_COLUMN_ID = process.env.COL_TOKEN_ID;

async function mondayQuery(query, variables = {}) {
  const res = await axios.post(
    "https://api.monday.com/v2",
    { query, variables },
    { headers: { Authorization: MONDAY_API_TOKEN, "Content-Type": "application/json" } }
  );
  return res.data;
}

async function generateTokens() {
  const query = `
    query getBoardItems($boardId: ID!) {
      boards(ids: [$boardId]) {
        items_page(limit: 100) {
          items {
            id
            name
            column_values(ids: ["${TOKEN_COLUMN_ID}"]) {
              id
              text
            }
          }
        }
      }
    }
  `;
  const data = await mondayQuery(query, { boardId: BOARD_ID });
  const items = data.data.boards[0].items_page.items;

  for (const item of items) {
    const existing = item.column_values[0]?.text;
    if (!existing) {
      const token = uuidv4();
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
      console.log(`✅ Token assigned for ${item.name}: ${token}`);
    }
  }
}

generateTokens().catch(console.error);
