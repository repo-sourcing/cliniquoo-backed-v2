const MedicalHistory = require("./model");

exports.create = async (data) => {
  return MedicalHistory.create(data);
};

exports.get = async (condition) => {
  return MedicalHistory.findAll(condition);
};

exports.update = async (data, condition) => {
  return MedicalHistory.update(data, condition);
};

exports.remove = async (condition) => {
  return MedicalHistory.destroy(condition);
};
