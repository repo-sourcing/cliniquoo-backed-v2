const userSubscription = require("./model");

exports.create = async (data) => {
  return userSubscription.create(data);
};

exports.get = async (condition) => {
  return userSubscription.findAll(condition);
};

exports.update = async (data, condition) => {
  return userSubscription.update(data, condition);
};

exports.remove = async (condition) => {
  return userSubscription.destroy(condition);
};
