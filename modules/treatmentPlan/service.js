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
exports.count = async data => {
  return treatmentPlan.count(data);
};
exports.sum = async data => {
  return treatmentPlan.sum(data);
};
