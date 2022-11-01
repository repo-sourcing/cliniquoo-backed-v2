const Patient = require("./model");

exports.create = async (data) => {
  return Patient.create(data);
};

exports.get = async (condition) => {
  return Patient.findAll(condition);
};

exports.update = async (data, condition) => {
  return Patient.update(data, condition);
};

exports.remove = async (condition) => {
  return Patient.destroy(condition);
};
