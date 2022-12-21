const { createClient, SchemaFieldTypes } = require("redis");
const redisClient = createClient({
  //   url: "redis://:@localhost:6379/0",
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
