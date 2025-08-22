const frequencyUsedMedicine = require("./model");

exports.create = async data => {
  return frequencyUsedMedicine.create(data);
};

exports.get = async condition => {
  return frequencyUsedMedicine.findAll(condition);
};

exports.update = async (data, condition) => {
  return frequencyUsedMedicine.update(data, condition);
};

exports.remove = async condition => {
  return frequencyUsedMedicine.destroy(condition);
};
exports.findOrCreate = async data => {
  return frequencyUsedMedicine.findOrCreate(data);
};
