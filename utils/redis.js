const { createClient, SchemaFieldTypes } = require("redis");
const redisClient = createClient({
  url: `redis://default:redispw@localhost:32769`,
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
