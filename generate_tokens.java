// generate_tokens.js
import axios from "axios";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

const MONDAY_API = "https://api.monday.com/v2";
const MONDAY_TOKEN = process.env.MONDAY_TOKEN;
const BOARD_ID = Number(process.env.BOARD_ID);
const COL_EMAIL = process.env.COL_EMAIL_ID;   // email column id
const COL_TOKEN = process.env.COL_TOKEN_ID;   // token column id

async function mondayQuery(q, vars) {
  const r = await axios.post(MONDAY_API, { query: q, variables: vars }, {
    headers: { Authorization: MONDAY_TOKEN, 'Content-Type': 'application/json' }
  });
  if (r.data.errors) {
    console.error("monday errors:", r.data.errors);
    throw new Error(JSON.stringify(r.data.errors));
  }
  return r.data.data;
}

async function fetchBoardItems() {
  const q = `query ($boardId:Int!) {
    boards (ids: [$boardId]) {
      items {
        id
        name
        column_values {
          id
          text
        }
      }
    }
  }`;
  const data = await mondayQuery(q, { boardId: BOARD_ID });
  return data.boards[0].items;
}

async function setTokenForItem(itemId, token) {
  const updates = {};
  updates[COL_TOKEN] = token;
  const colValuesStr = JSON.stringify(updates).replace(/"/g,'\\"');
  const mutation = `mutation {
    change_multiple_column_values(board_id: ${BOARD_ID}, item_id: ${itemId}, column_values: "${colValuesStr}") {
      id
    }
  }`;
  await mondayQuery(mutation);
}

(async () => {
  if (!MONDAY_TOKEN || !BOARD_ID || !COL_EMAIL || !COL_TOKEN) {
    console.error("Set MONDAY_TOKEN, BOARD_ID, COL_EMAIL_ID, COL_TOKEN_ID in .env");
    process.exit(1);
  }
  const items = await fetchBoardItems();
  console.log("Found", items.length, "items");

  for (const it of items) {
    const emailCol = it.column_values.find(c => c.id === COL_EMAIL);
    const email = emailCol ? emailCol.text : null;
    if (!email) {
      console.log("Skipping item (no email):", it.id, it.name);
      continue;
    }
    // generate secure random token
    const token = crypto.randomBytes(32).toString("hex");
    await setTokenForItem(it.id, token);
    console.log(`Set token for ${email} (item ${it.id})`);
    await new Promise(r => setTimeout(r, 250)); // avoid monday rate limit
  }
  console.log("Done.");
})();
