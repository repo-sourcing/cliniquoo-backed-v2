const Sequelize = require("sequelize");
require("dotenv").config();
const env = process.env.NODE_ENV;
const config = require("./config.json")[env];
const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  config
);

console.log(config);
sequelize
  .sync({ alter: true })
  .then(() => {
    console.log("database connected successfully");
  })
  .catch((err) => {
    console.error("Unable to connect to the database:", err);
  });
module.exports = sequelize;
