const userTransaction = require("./model");

exports.create = async (data) => {
  return userTransaction.create(data);
};

exports.get = async (condition) => {
  return userTransaction.findAll(condition);
};

exports.update = async (data, condition) => {
  return userTransaction.update(data, condition);
};

exports.remove = async (condition) => {
  return userTransaction.destroy(condition);
};
