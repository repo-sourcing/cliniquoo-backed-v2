const Transaction = require("./model");

exports.create = async (data) => {
  return Transaction.create(data);
};

exports.get = async (condition) => {
  return Transaction.findAll(condition);
};
exports.sum = async (data, query) => {
  return await Transaction.sum(data, query);
};

exports.update = async (data, condition) => {
  return Transaction.update(data, condition);
};

exports.remove = async (condition) => {
  return Transaction.destroy(condition);
};
