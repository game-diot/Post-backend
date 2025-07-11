//全局文件
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();
//导入自定义模块
const connectDB = require("./config/db");
const authRouter = require("./routes/authRouter"); // 认证相关路由
const postRouter = require("./routes/postRouter"); // 文章相关路由
const app = express();
// 导入 Cloudinary SDK
const cloudinary = require("cloudinary").v2;

// 初始化 Cloudinary 配置
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // 推荐使用 HTTPS 连接 Cloudinary
});

//全局中间件配置
app.use(
  cors({
    credentials: true,
    origin: "https://post-frontend-eight.vercel.app", // 确保这里是你的前端地址
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json()); // 解析 JSON 格式的请求体
app.use(cookieParser()); // 解析 Cookie

// 连接数据库
connectDB();

// 路由挂载
app.use("/", authRouter);
app.use("/", postRouter);
//添加ping保证后端服务持续启动避免冷启动
app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});
//服务器相关内容
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Frontend should be running on http://localhost:5173`);
});
