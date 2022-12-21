const DailyActivity = require("./model");

exports.create = async (data) => {
  return DailyActivity.create(data);
};

exports.get = async (condition) => {
  return DailyActivity.findAll(condition);
};

exports.update = async (data, condition) => {
  return DailyActivity.update(data, condition);
};

exports.remove = async (condition) => {
  return DailyActivity.destroy(condition);
};
