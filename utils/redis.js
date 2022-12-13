const { createClient, SchemaFieldTypes } = require("redis");

const redisClient = createClient({
  //   url: "redis://:@localhost:6379/0",
});

(async function () {
  await redisClient.connect();
  console.log("Redis connected successfully");
})();

module.exports = redisClient;
