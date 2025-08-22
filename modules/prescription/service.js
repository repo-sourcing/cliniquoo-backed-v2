const Prescription = require("./model");

exports.create = async (data, transaction = {}) => {
  return Prescription.create(data, transaction);
};

exports.get = async condition => {
  return Prescription.findAll(condition);
};

exports.update = async (data, condition) => {
  return Prescription.update(data, condition);
};

exports.remove = async condition => {
  return Prescription.destroy(condition);
};

exports.bulkCreate = async data => {
  return await Prescription.bulkCreate(data);
};
