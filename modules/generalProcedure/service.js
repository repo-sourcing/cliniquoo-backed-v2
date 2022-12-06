const GeneralProcedure = require("./model");

exports.create = async (data) => {
  return GeneralProcedure.create(data);
};

exports.get = async (condition) => {
  return GeneralProcedure.findAll(condition);
};

exports.update = async (data, condition) => {
  return GeneralProcedure.update(data, condition);
};

exports.remove = async (condition) => {
  return GeneralProcedure.destroy(condition);
};
