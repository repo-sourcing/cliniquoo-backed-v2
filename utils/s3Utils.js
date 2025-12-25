const AWS = require("aws-sdk");
const createError = require("http-errors");

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    Bucket: process.env.Bucket,
});

exports.deleteFromS3 = async (url) => {
    if (!url) {
        throw createError(400, "Url is required");
    }
    const key = url.split("/").pop();
    const params = {
        Bucket: process.env.Bucket,
        Key: key,
    };
    return await s3.deleteObject(params).promise();
};
