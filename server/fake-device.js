const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const KEY = process.argv[2] || process.env.DEMO_DEVICE_KEY_1 || "dev-door-lagera-1";
const SERVER = process.argv[3] || `http://localhost:${process.env.PORT || 3000}`;
const FAIL = process.env.FAIL === "1";
const headers = { "Content-Type": "application/json", "X-Device-Key": KEY };

async function tick() {
  try {
    const res = await fetch(`${SERVER}/api/device/commands`, { headers });
    const body = await res.json();
    if (!res.ok) return console.error(`poll failed (${res.status}): ${body.error}`);
    if (!body.command_id) return;

    console.log(`${new Date().toLocaleTimeString()} got "${body.action}" (${body.command_id}), clicking the relay...`);
    await new Promise((r) => setTimeout(r, 500));
    const ack = await fetch(`${SERVER}/api/device/ack`, {
      method: "POST",
      headers,
      body: JSON.stringify(FAIL ? { command_id: body.command_id, status: "error", error: "Relay test failure" } : { command_id: body.command_id, status: "opened" }),
    });
    console.log(`  acked ${FAIL ? "error" : "opened"} -> ${ack.status}`);
  } catch (err) {
    console.error(`server unreachable: ${err.message}`);
  }
}

console.log(`Fake device polling ${SERVER} every second with key ${KEY}`);
setInterval(tick, 1000);
