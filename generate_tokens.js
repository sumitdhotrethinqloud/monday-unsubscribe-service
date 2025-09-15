// generate_tokens.js
import axios from "axios";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

const MONDAY_API = "https://api.monday.com/v2";
const MONDAY_TOKEN = process.env.MONDAY_TOKEN;
const BOARD_ID = process.env.BOARD_ID; // leave as string for GraphQL ID!
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
  let allItems = [];
  let cursor = null;

  const q = `query ($boardId: ID!, $cursor: String) {
    boards (ids: [$boardId]) {
      items_page (limit: 500, cursor: $cursor) {
        cursor
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
  }`;

  while (true) {
    const data = await mondayQuery(q, { boardId: BOARD_ID, cursor });
    const page = data.boards[0].items_page;
    allItems = allItems.concat(page.items);

    if (!page.cursor) break; // no more pages
    cursor = page.cursor;    // fetch next page
  }

  return allItems;
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
    const tokenCol = it.column_values.find(c => c.id === COL_TOKEN);

    const email = emailCol ? emailCol.text : null;
    const existingToken = tokenCol ? tokenCol.text : null;

    if (!email) {
      console.log("⏭ Skipping item (no email):", it.id, it.name);
      continue;
    }

    if (existingToken) {
      console.log(`⏭ Skipping ${email} (already has token)`);
      continue;
    }

    // generate secure random token
    const token = crypto.randomBytes(32).toString("hex");
    await setTokenForItem(it.id, token);

    console.log(`✅ Set token for ${email} (item ${it.id})`);

    // avoid monday rate limit
    await new Promise(r => setTimeout(r, 250));
  }

  console.log("Done.");
})();
