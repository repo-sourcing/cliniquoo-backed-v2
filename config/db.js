const Sequelize = require("sequelize");
require("dotenv").config();
const env = process.env.NODE_ENV;
const db_config = require("./config")[env];
const sequelize = new Sequelize(
  db_config.database,
  db_config.username,
  db_config.password,
  db_config,
  {
    logging: false,
  }
);

console.log(db_config);
sequelize
  .authenticate()
  // .sync()
  .then(() => {
    console.log("database connected successfully");
  })
  .catch((err) => {
    console.error("Unable to connect to the database:", err);
  });
module.exports = sequelize;
