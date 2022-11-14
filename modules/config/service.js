const Config = require("./model");

exports.create = async (data) => {
  return Config.create(data);
};

exports.get = async (conditions) => {
  return Config.findAll(conditions);
};

exports.update = async (data, condition) => {
  return Config.update(data, condition);
};
