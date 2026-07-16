import axios from "axios";

const BASE_URL = "http://localhost:8000/api/v1";
const MARKET = "BTC_INR";
const SCALE = 100_000_000;

// User credentials (ensure this user is seeded in your DB)
const USER_CONFIG = {
  email: "punit@gmail.com", // Or user_id
  password: "12345678",
};

let authToken: string | null = null;

async function authenticate() {
  try {
    console.log("🔑 Authenticating Market Maker...");
    const response = await axios.post(`${BASE_URL}/auth/login`, {
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
      const price = Math.floor((10000 + Math.random() * 1000) * SCALE);
      const quantity = Math.floor(Math.random() * 0.5 * SCALE);

      console.log(
        `[BOT] Placing ${side} order: ${quantity / SCALE} BTC @ ${
          price / SCALE
        } INR`
      );

      await axios.post(
        `${BASE_URL}/order`,
        {
          price,
          quantity,
          side,
          type: "limit",
          baseAsset: "GRT",
          quoteAsset: "ETH",
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
  }, 1000);
}

runMarketMaker();

// import axios from "axios";

// const BASE_URL = "http://localhost:3000";
// const TOTAL_BIDS = 15;
// const TOTAL_ASK = 15;
// const baseAsset = "BTC";
// const quoteAsset = "INR";
// const MARKET = "BTC_INR";
// const USER_ID = "usr_xslwr9hnet";
// const SCALE = 100_000_000; // 10^8 Satoshi Multiplier

// interface Order {
//   price: number;
//   quantity: number;
//   filled: number;
//   status: string;
//   orderId: string;
//   side: "buy" | "sell";
//   userID: string;
// }

// interface OpenOrdersResponse {
//   bids: Order[];
//   asks: Order[];
// }

// async function main() {
//   try {
//     const price = 100 + Math.random() * 10;

//     console.log(
//       `${BASE_URL}/api/v1/order/open?userId=${USER_ID}&market=${MARKET}&type=open`
//     );
//     const openOrders = await axios.get<OpenOrdersResponse>(
//       `${BASE_URL}/api/v1/order?userId=${USER_ID}&market=${MARKET}&type=open`
//     );

//     console.log("================", openOrders.data);

//     const totalBids = openOrders.data.bids.length;
//     const totalAsks = openOrders.data.asks.length;

//     const cancelledBids = await cancelBidsMoreThan(openOrders.data.bids, price);
//     const cancelledAsks = await cancelAsksLessThan(openOrders.data.asks, price);

//     let bidsToAdd = TOTAL_BIDS - totalBids + cancelledBids;
//     let asksToAdd = TOTAL_ASK - totalAsks + cancelledAsks;

//     while (bidsToAdd > 0 || asksToAdd > 0) {
//       if (bidsToAdd > 0) {
//         console.log(`${BASE_URL}/api/v1/order1----------`);

//         // 1. Calculate and Scale the values
//         const targetPrice = price - Math.random() * 1;
//         const scaledPrice = Math.round(targetPrice * SCALE);
//         const scaledQuantity = Math.round(10 * SCALE); // 10 BTC

//         await axios.post(`${BASE_URL}/api/v1/order`, {
//           price: scaledPrice, // Sent as raw Numbers!
//           quantity: scaledQuantity, // Sent as raw Numbers!
//           side: "buy",
//           user_id: USER_ID,
//           type: "limit",
//           baseAsset,
//           quoteAsset,
//         });
//         bidsToAdd--;
//       }
//       if (asksToAdd > 0) {
//         console.log(`${BASE_URL}/api/v1/order2`);

//         // 1. Calculate and Scale the values
//         const targetPrice = price + Math.random() * 1;
//         const scaledPrice = Math.round(targetPrice * SCALE);
//         const scaledQuantity = Math.round(10 * SCALE);

//         await axios.post(`${BASE_URL}/api/v1/order`, {
//           price: scaledPrice,
//           quantity: scaledQuantity,
//           side: "sell",
//           user_id: USER_ID,
//           type: "limit",
//           baseAsset,
//           quoteAsset,
//         });
//         asksToAdd--;
//       }
//       await new Promise((resolve) => setTimeout(resolve, 1000));
//     }
//   } catch (err) {
//     throw Error(`${err}---------------err`);
//   }

//   main();
// }

// async function cancelBidsMoreThan(bids: Order[], targetPrice: number) {
//   // Convert target back to scaled for comparison against engine data
//   const scaledTarget = targetPrice * SCALE;

//   const promises = bids
//     .filter((o) => o.price > scaledTarget || Math.random() < 0.1)
//     .map((o) => {
//       console.log(`${BASE_URL}/api/v1/order3`);
//       return axios.delete(`${BASE_URL}/api/v1/order`, {
//         data: {
//           order_id: o.orderId,
//           user_id: USER_ID,
//           base_asset: baseAsset,
//           quote_asset: quoteAsset,
//           side: "buy",
//         },
//       });
//     });

//   await Promise.all(promises);
//   return promises.length;
// }

// async function cancelAsksLessThan(asks: Order[], targetPrice: number) {
//   const scaledTarget = targetPrice * SCALE;

//   const promises = asks
//     .filter((o) => o.price < scaledTarget || Math.random() < 0.5)
//     .map((o) => {
//       console.log(`${BASE_URL}/api/v1/order4`);
//       return axios.delete(`${BASE_URL}/api/v1/order`, {
//         data: {
//           order_id: o.orderId,
//           user_id: USER_ID,
//           base_asset: baseAsset,
//           quote_asset: quoteAsset,
//           side: "sell",
//         },
//       });
//     });

//   await Promise.all(promises);
//   return promises.length;
// }

// main();
