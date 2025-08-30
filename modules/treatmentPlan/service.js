const treatmentPlan = require("./model");

exports.create = async data => {
  return treatmentPlan.create(data);
};

exports.get = async condition => {
  return treatmentPlan.findAll(condition);
};

exports.update = async (data, condition) => {
  return treatmentPlan.update(data, condition);
};

exports.remove = async condition => {
  return treatmentPlan.destroy(condition);
};
exports.findOrCreate = async data => {
  return treatmentPlan.findOrCreate(data);
};
exports.count = async (data, condition) => {
  return treatmentPlan.count(data, condition);
};
exports.sum = async (data, condition) => {
  return treatmentPlan.sum(data, condition);
};
