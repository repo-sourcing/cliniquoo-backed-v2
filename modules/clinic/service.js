const Clinic = require("./model");

exports.create = async (data) => {
  return Clinic.create(data);
};

exports.get = async (condition) => {
  return Clinic.findAll(condition);
};

exports.update = async (data, condition) => {
  return Clinic.update(data, condition);
};

exports.remove = async (condition) => {
  return Clinic.destroy(condition);
};
exports.count = async (data) => {
  return await Clinic.count(data);
};
