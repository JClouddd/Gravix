import julesClient from "./src/lib/julesClient.js";
process.env.JULES_API_KEY = process.env.JULES_API_KEY || "test";
async function test() {
  try {
    const res = await julesClient.listSessions();
    console.log("SUCCESS:", JSON.stringify(res).slice(0, 500));
  } catch (err) {
    console.error("FAIL:", err.message);
  }
}
test();
