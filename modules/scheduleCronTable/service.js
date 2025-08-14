const Visitor = require("./model");

exports.create = async (data) => {
  return Visitor.create(data);
};

exports.findOrCreate = async (data) => {
  return Visitor.findOrCreate(data);
};

exports.get = async (condition) => {
  return Visitor.findAll(condition);
};
exports.findAndCountAll = async (condition) => {
  return Visitor.findAndCountAll(condition);
};

exports.update = async (data, condition) => {
  return Visitor.update(data, condition);
};
exports.count = async (query) => {
  return Visitor.count(query);
};

exports.remove = async (condition) => {
  return Visitor.destroy(condition);
};
