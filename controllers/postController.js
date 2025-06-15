// backend/controllers/postController.js
const Post = require("../models/Post");
const cloudinary = require("cloudinary").v2; // 确保导入 Cloudinary

// 定义创建文章的处理函数
const createPost = async (req, res) => {
  try {
    const { title, summary, content } = req.body;

    if (!title || !summary || !content) {
      return res
        .status(400)
        .json({ error: "所有字段 (标题、摘要、内容) 都是必填项" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "封面图片是必填项" });
    }

    // 将文件从内存 (req.file.buffer) 上传到 Cloudinary
    // 这是 `result` 变量的来源，它包含了上传后的图片信息和 URL
    const result = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
      {
        folder: "blog-posts", // 在 Cloudinary 中创建名为 'blog-posts' 的文件夹
        resource_type: "auto", // 自动检测上传文件的类型
      }
    );

    const postDoc = await Post.create({
      title,
      summary,
      content,
      imageUrl: result.secure_url,
      author: req.user.id,
    });

    res.status(201).json(postDoc);
  } catch (error) {
    console.error("创建文章出错:", error);
    res.status(500).json({ error: "创建文章失败", details: error.message });
  }
};

// 定义更新文章的处理函数
const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, summary, content } = req.body;
    let newImageUrl = null; // 用于存储新的或旧的图片 URL

    console.log(`[DEBUG - updatePost] 尝试更新文章 ID: ${id}`);
    console.log(`[DEBUG - updatePost] 请求体:`, req.body);

    const postDoc = await Post.findById(id);
    if (!postDoc) {
      console.log(`[DEBUG - updatePost] 未找到文章，ID: ${id}`);
      return res.status(404).json({ error: "文章未找到" });
    }

    const isAuthor = String(postDoc.author) === String(req.user.id);
    if (!isAuthor) {
      console.log(
        `[DEBUG - updatePost] 用户 ${req.user.username} 无权更新文章 ID: ${id}`
      );
      return res.status(403).json({ error: "您无权更新此文章" });
    }

    // 逻辑判断，如果有新的文件上传
    if (req.file) {
      // 将新文件上传到 Cloudinary
      const result = await cloudinary.uploader.upload(
        `data:${req.file.mimetype};base64,${req.file.buffer.toString(
          "base64"
        )}`,
        {
          folder: "blog-posts", // 确保这里使用的文件夹名称与创建时一致
          resource_type: "auto",
        }
      );
      newImageUrl = result.secure_url; // 更新为 Cloudinary 返回的新 URL

      // 删除 Cloudinary 上的旧图片 (推荐：清理存储空间)
      if (postDoc.imageUrl && postDoc.imageUrl.includes("res.cloudinary.com")) {
        const urlParts = postDoc.imageUrl.split("/");
        // 确保提取的是文件名部分，然后去除扩展名，再与文件夹名组合
        const filenameWithExtension = urlParts[urlParts.length - 1];
        const publicIdWithoutFolder = filenameWithExtension.split(".")[0];
        const publicIdToDelete = `blog-posts/${publicIdWithoutFolder}`;

        try {
          await cloudinary.uploader.destroy(publicIdToDelete);
          console.log(
            `Cloudinary: 成功删除旧图片，Public ID: ${publicIdToDelete}`
          );
        } catch (deleteError) {
          console.warn(
            `Cloudinary: 删除旧图片 ${publicIdToDelete} 失败:`,
            deleteError.message
          );
        }
      }
    } else {
      // 如果没有新的文件上传，保持旧的图片URL
      newImageUrl = postDoc.imageUrl;
    }

    // 更新文章文档
    await Post.findByIdAndUpdate(
      id,
      {
        title,
        summary,
        content,
        imageUrl: newImageUrl, //更新为新的或现有的 Cloudinary URL
      },
      { new: true } // 返回更新后的文档
    );

    console.log(`[DEBUG - updatePost] 文章 ID ${id} 更新成功。`);
    res.json({ message: "文章更新成功" });
  } catch (error) {
    console.error("更新文章出错:", error);
    res.status(500).json({ error: "更新文章失败", details: error.message });
  }
};

// 定义获取所有文章的处理函数
const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("author", ["username"])
      .sort({ createdAt: -1 })
      .limit(20);

    // 图片 URL 已经是完整的 Cloudinary URL，无需再拼接
    res.json(posts);
  } catch (error) {
    console.error("获取文章列表出错:", error);
    res.status(500).json({ error: "获取文章列表失败", details: error.message });
  }
};

// 定义获取单个文章的处理函数
const getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[DEBUG - getPostById] 请求文章 ID: ${id}`);

    const post = await Post.findById(id).populate("author", ["username"]);

    console.log(
      `[DEBUG - getPostById] 从数据库获取的原始文章:`,
      post ? post.toObject() : "文章未找到"
    );

    if (!post) {
      console.log(`[DEBUG - getPostById] 未找到文章，ID: ${id}`);
      return res.status(404).json({ error: "文章未找到" });
    }

    res.json(post);
  } catch (error) {
    console.error("[DEBUG - getPostById] 根据 ID 获取文章出错:", error);
    res.status(500).json({ error: "获取文章失败", details: error.message });
  }
};

// 定义删除文章的处理函数
const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const postDoc = await Post.findById(id);

    if (!postDoc) {
      console.log(`[DEBUG - deletePost] 文章未找到，ID: ${id}`);
      return res.status(404).json({ error: "文章未找到" });
    }

    if (!req.user || !req.user.id) {
      console.log(`[DEBUG - deletePost] 用户未认证。`);
      return res.status(401).json({ error: "用户未认证，请登录" });
    }

    const isAuthor = String(postDoc.author) === String(req.user.id);
    if (!isAuthor) {
      console.log(
        `[DEBUG - deletePost] 用户 ${req.user.username} (ID: ${req.user.id}) 无权删除文章 ID: ${id}`
      );
      return res.status(403).json({ error: "无权删除此文章" });
    }

    // 删除 Cloudinary 上的图片 (如果 imageUrl 存在且是 Cloudinary 的 URL)
    if (postDoc.imageUrl && postDoc.imageUrl.includes("res.cloudinary.com")) {
      const urlParts = postDoc.imageUrl.split("/");
      const filenameWithExtension = urlParts[urlParts.length - 1];
      const publicIdWithoutFolder = filenameWithExtension.split(".")[0];
      const publicIdToDelete = `blog-posts/${publicIdWithoutFolder}`; // 组合文件夹名和文件名

      try {
        await cloudinary.uploader.destroy(publicIdToDelete);
        console.log(`Cloudinary: 成功删除图片，Public ID: ${publicIdToDelete}`);
      } catch (deleteError) {
        console.warn(
          `Cloudinary: 删除图片 ${publicIdToDelete} 失败:`,
          deleteError.message
        );
      }
    }

    // 从数据库中删除文章
    await Post.findByIdAndDelete(id);
    console.log(`[DEBUG - deletePost] 文章 ID: ${id} 删除成功。`);
    res.json({ message: "文章删除成功" });
  } catch (error) {
    console.error("删除文章失败:", error);
    res.status(500).json({ error: "删除文章失败", details: error.message });
  }
};

// 导出创建,更新,删除,获取文章的处理函数
module.exports = {
  createPost,
  updatePost,
  getAllPosts,
  getPostById,
  deletePost,
};
