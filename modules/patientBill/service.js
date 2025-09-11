const PatientBill = require("./model");

exports.create = async data => {
  return PatientBill.create(data);
};

exports.get = async condition => {
  return PatientBill.findAll(condition);
};

exports.update = async (data, condition) => {
  return PatientBill.update(data, condition);
};

exports.remove = async condition => {
  return PatientBill.destroy(condition);
};
exports.findOrCreate = async data => {
  return PatientBill.findOrCreate(data);
};
