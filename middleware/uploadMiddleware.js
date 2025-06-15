//中间件文件,用于文件上传
const multer = require("multer");

// 配置 multer，定义上传的文件存储方式
const storage = multer.memoryStorage();

// 定义文件上传中间件，使用 multer 方法，传入上述 storage 对象
const uploadMiddleware = multer({
  storage: storage,
  // fileFilter 方法定义了文件的过滤规则，只允许上传 jpg、jpeg、png、gif 格式的文件
  fileFilter: (req, file, cb) => {
    // 使用 /i 进行不区分大小写的匹配，确保所有大小写的文件扩展名都能被识别
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
      return cb(
        new Error(
          "Invalid file type. Only JPG, JPEG, PNG, and GIF image files are allowed!"
        ),
        false
      );
    }
    cb(null, true);
  },
  //限制文件大小5MB
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// 导出 uploadMiddleware 中间件
module.exports = uploadMiddleware;
