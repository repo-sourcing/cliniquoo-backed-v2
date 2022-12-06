const GeneralTreatment = require("./model");

exports.create = async (data) => {
  return GeneralTreatment.create(data);
};

exports.get = async (condition) => {
  return GeneralTreatment.findAll(condition);
};

exports.update = async (data, condition) => {
  return GeneralTreatment.update(data, condition);
};

exports.remove = async (condition) => {
  return GeneralTreatment.destroy(condition);
};
