import { DateTime } from "luxon";

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const API = "https://discord.com/api/v10";
const ZONE = "America/New_York";
const CHANNEL_NAME = "time-converter";

if (!TOKEN || !GUILD_ID) {
  throw new Error("Missing DISCORD_TOKEN or GUILD_ID repository secret.");
}

async function discord(method, path, body) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bot ${TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "Daily3PMTimeBot/1.0"
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Discord API ${response.status}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

async function main() {
  const now = DateTime.now().setZone(ZONE);
  const target = now.set({
    hour: 15,
    minute: 0,
    second: 0,
    millisecond: 0
  });
  const timestamp = Math.floor(target.toSeconds());
  const content = `my 3 pm is your <t:${timestamp}:t>`;

  const me = await discord("GET", "/users/@me");
  const channels = await discord("GET", `/guilds/${GUILD_ID}/channels`);

  let channel = channels.find(
    item => item.name === CHANNEL_NAME && item.type === 0
  );

  if (!channel) {
    channel = await discord("POST", `/guilds/${GUILD_ID}/channels`, {
      name: CHANNEL_NAME,
      type: 0,
      topic: "Daily 3 PM Eastern time converted to your local time."
    });
    console.log("Created #time-converter.");
  }

  const messages = await discord(
    "GET",
    `/channels/${channel.id}/messages?limit=100`
  );

  const previous = messages.find(
    item =>
      item.author.id === me.id &&
      item.content.startsWith("my 3 pm is your ")
  );

  if (previous) {
    await discord(
      "PATCH",
      `/channels/${channel.id}/messages/${previous.id}`,
      { content }
    );
    console.log("Updated the existing timestamp message.");
  } else {
    await discord("POST", `/channels/${channel.id}/messages`, {
      content,
      allowed_mentions: { parse: [] }
    });
    console.log("Posted the timestamp message.");
  }

  console.log(`Target: ${target.toISO()} (${ZONE})`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
