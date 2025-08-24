// scripts/add-player.mjs
import { sql } from "@vercel/postgres";

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const args = new Map();
process.argv.slice(2).forEach((v, i, arr) => {
  if (v.startsWith("--")) args.set(v, arr[i + 1]);
});

const name = args.get("--name") || "Joe Burrow";
const position = (args.get("--position") || "QB").toUpperCase();
const espnId = args.get("--espn-id") || "3915511"; // optional but nice for uniqueness
const slug = `${slugify(name)}-${espnId}`;

const league = "nfl";

try {
  const { rows } = await sql/* sql */`
    INSERT INTO players (player_name, image_url, position, league, slug)
    VALUES (${name}, NULL, ${position}, ${league}, ${slug})
    ON CONFLICT (slug) DO UPDATE SET position = EXCLUDED.position
    RETURNING player_id, player_name, position, slug;
  `;
  console.log("Upserted player:", rows[0]);
} catch (e) {
  console.error(e);
  process.exit(1);
}
