const multerS3 = require("multer-s3");
const AWS = require("aws-sdk");
const multer = require("multer");
const path = require("path");

// S3 configuration - provide defaults for local/test environments
const bucket = process.env.Bucket || "mock-bucket-for-testing";

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || "mock-key",
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "mock-secret",
  Bucket: bucket,
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: bucket,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    contentDisposition: "inline",
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  }),
});

module.exports = upload;
