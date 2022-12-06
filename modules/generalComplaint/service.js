const GeneralComplain = require("./model");

exports.create = async (data) => {
  return GeneralComplain.create(data);
};

exports.get = async (condition) => {
  return GeneralComplain.findAll(condition);
};

exports.update = async (data, condition) => {
  return GeneralComplain.update(data, condition);
};

exports.remove = async (condition) => {
  return GeneralComplain.destroy(condition);
};
