const { createClient, SchemaFieldTypes } = require("redis");
const redisClient = createClient({
  url: `redis://:@localhost:${
    process.env.NODE_ENV === "production" ? "6379" : "6380"
  }/0`,
});

try {
  (async function () {
    await redisClient.connect();
    console.log("Redis connected successfully");
  })();
} catch (error) {
  console.log(error);
}

module.exports = redisClient;
