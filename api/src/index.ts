import express from "express";
import { router } from "./routes/routes";

const app = express();

app.use("/api/v1",router)

app.listen(3000, () => {
  console.log("listening app on port", 3000);
});
