const Subscription = require("./model");

exports.create = async (data) => {
  return Subscription.create(data);
};

exports.get = async (condition) => {
  return Subscription.findAll(condition);
};

exports.update = async (data, condition) => {
  return Subscription.update(data, condition);
};

exports.remove = async (condition) => {
  return Subscription.destroy(condition);
};
