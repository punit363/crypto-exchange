⚡ Apex Exchange: High-Frequency Central Limit Order Book (CLOB)Project DescriptionApex Exchange is a full-stack, decoupled, event-driven cryptocurrency spot trading platform designed to facilitate microsecond matching engine execution speeds ($< 15\mu\text{s}$), live charting synchronization, and crash-resistant persistent processing.By separating Pre-Trade Risk Checking, Execution (Matching), and Post-Trade Settlement (Clearing), the architecture operates at maximum efficiency without single-threaded bottlenecks or relational database blocking. All math on the platform is scaled by $10^8$ (Satoshi multiplier) and processed as BigInts, bypassing the notorious floating-point rounding errors native to V8 engines and preventing financial rounding hazards.InstallationFollow these steps to spin up the local development ecosystem:# 1. Clone the repository
git clone https://github.com/your-repo/apex-exchange.git
cd apex-exchange

# 2. Install dependencies
npm install

# 3. Spin up infrastructure containers
docker run -d --name apex-redis -p 6379:6379 redis:alpine
docker run -d --name apex-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=apex_exchange -p 5432:5432 postgres:alpine

# 4. Migrate database schemas and seed test accounts
npx prisma db push
npx prisma db seed
UsageStart the parallel components of your high-throughput exchange locally:# Run the Next.js API Gateway / BFF
npm run dev

# Run the in-memory core Matching Engine Loop
npm run engine:start

# Run the asynchronous Database Sync Worker
npm run worker:start
Placing an Order via API:curl -X POST http://localhost:8000/api/v1/order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_jwt>" \
  -d '{
    "price": 1036600000000, 
    "quantity": 9400000000, 
    "side": "sell",
    "type": "limit",
    "baseAsset": "MATIC",
    "quoteAsset": "ETH"
  }'
FeaturesSatoshi Math System: Zero floating-point drift. Prices and quantities are handled as strict 64-bit BigInt multipliers.Decoupled Architecture: The matching engine runs 100% in-memory and is never blocked by network calls, I/O, or database writes.RTR Session Gate: Secure cookie-based token rotation protects page transitions and API paths smoothly at the Next.js edge level.Persistent Cash Safety: All updates queue asynchronously into Redis streams before being safely digested by transactional database workers.ContributingWe welcome contributions to optimize match speeds or expand quote hubs!🚧 Witty Coming Soon Message:Our formal contribution pipeline is currently more exclusive than an institutional dark pool. If you try to push directly to main, our Pre-Trade Risk engine will interpret it as a hostile takeover attempt and liquidate your pull request. Sit tight—automated CI/CD gates and lint linters are on the way!LicenseDistributed under the MIT License. See LICENSE for more information.4. Enhancing Your READMEBadgesWe use dynamic shields to showcase the real-time operational limits of the engine:Latency Guard: [Engine-Latency: < 15μs]Math Protocol: [Math: 10^8 Integer]CI State: [Build: Passing]Screenshots and GIFsHere is a visual breakdown of how our central order matching pipeline visualizes resting bid limits:(An elegant UI preview mapping actual order states securely without horizontal scrolling)🚧 Witty Coming Soon Message:A high-resolution GIF of our Order Panel matching 50,000 requests per second is currently being rendered. We wanted to upload it, but our frame-rate was so high it exceeded GitHub’s maximum asset payload limit. We are working on compressing our speeds into a human-readable pace.DocumentationComplete REST and WebSocket specifications are compiled in our developer gateway.🚧 Witty Coming Soon Message:Our API Docs are currently compiling on a quantum server. Until that finishes, reading our TypeScript definitions in httpClient.ts directly serves as the ultimate source of truth. Types don't lie, even when the internet does.Changelog[1.1.0] - 2026-07-16Fix: Resolved an alignment bug in OrderPanel.tsx that caused row column height mismatches on the "Order History" tab.Feature: Connected live ORDER WS channels directly to the order table to auto-reflect placement, updates, and cancellations instantly.Improvement: Streamlined cookie middleware parameters, upgrading token expiration settings to standard session lifetimes.[1.0.0] - 2026-06-01Genesis: Initial launch of the LMAX-inspired in-memory match sequencer.5. ConclusionApex Exchange represents the next step in distributed, low-latency financial systems. By keeping our business logic focused entirely on in-memory matches and managing risk boundaries outside of execution threads, we scale to match the future of spot commodity trading. For questions, access credentials, or benchmark comparisons, open an issue in the repository.