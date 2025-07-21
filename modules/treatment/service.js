const Treatment = require("./model");

exports.create = async (data) => {
  return Treatment.create(data);
};

exports.get = async (condition) => {
  return Treatment.findAll(condition);
};
exports.getSum = async (condition) => {
  return Treatment.sum(condition);
};

exports.update = async (data, condition) => {
  return Treatment.update(data, condition);
};

exports.remove = async (condition) => {
  return Treatment.destroy(condition);
};

exports.sum = async (data, query) => {
  return await Treatment.sum(data, query);
};
