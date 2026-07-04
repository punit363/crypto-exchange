import express from "express";
import cors from "cors";
import router from "./routes/routes";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/v1", router);

app.listen(3000, () => {
  console.log("listening app on port", 3000);
});
