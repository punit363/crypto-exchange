import axios from "axios";
import { CONFIG } from "./config.js";

const CLIENT_URL = CONFIG.CLIENT_URL;
const BASE = CONFIG.MM_BASE_ASSET;
const QUOTE = CONFIG.MM_QUOTE_ASSET;
const SCALE = CONFIG.SCALE;
// User credentials (ensure this user is seeded in your DB)
const USER_CONFIG = {
  email: "punit@gmail.com", // Or user_id
  password: "12345678",
};

let authToken: string | null = null;

async function authenticate() {
  try {
    console.log("🔑 Authenticating Market Maker...");
    const response = await axios.post(`${CLIENT_URL}/auth/login`, {
      email: USER_CONFIG.email,
      password: USER_CONFIG.password,
    });

    // Extract token from response
    authToken = response.data.data.access_token;
    console.log("✅ Authenticated successfully.");
  } catch (err: any) {
    console.error(
      "❌ Authentication failed:",
      err.response?.data?.message || err.message
    );
    process.exit(1);
  }
}

async function runMarketMaker() {
  await authenticate();

  console.log("🚀 Starting Market Maker Bot...");

  setInterval(async () => {
    try {
      const side = Math.random() > 0.5 ? "buy" : "sell";
      const price = (10000 + Math.floor(Math.random() * 1000)) * SCALE;
      const quantity = Math.floor(Math.random() * 100) * SCALE;

      console.log(
        `[BOT] Placing ${side} order: ${quantity / SCALE} BTC @ ${
          price / SCALE
        } INR`
      );

      await axios.post(
        `${CLIENT_URL}/order`,
        {
          price,
          quantity,
          side,
          type: "limit",
          baseAsset: BASE,
          quoteAsset: QUOTE,
        },
        {
          headers: {
            // Inject the token manually since we aren't in a browser
            access_token: `Bearer ${authToken}`,
          },
        }
      );
    } catch (err: any) {
      console.error(
        "[BOT ERROR] Failed to place order:",
        err.response?.data?.message || err.message
      );

      // If 401, re-authenticate
      if (err.response?.status === 401) {
        console.log("🔄 Token expired, re-authenticating...");
        await authenticate();
      }
    }
  }, 100);
}

runMarketMaker();
