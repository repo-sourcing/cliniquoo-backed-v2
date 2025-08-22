const Medicine = require("./model");

exports.create = async data => {
  return Medicine.create(data);
};

exports.get = async condition => {
  return Medicine.findAll(condition);
};
exports.findAndCountAll = async condition => {
  return Medicine.findAndCountAll(condition);
};
exports.sum = async (data, query) => {
  return await Medicine.sum(data, query);
};

exports.update = async (data, condition) => {
  return Medicine.update(data, condition);
};

exports.remove = async condition => {
  return Medicine.destroy(condition);
};

exports.bulkCreate = async (data, transaction = {}) => {
  return await Medicine.bulkCreate(data, transaction);
};
