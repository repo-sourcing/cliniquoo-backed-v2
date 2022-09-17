const User = require("./model");

exports.create = async (data) => {
  return User.create(data);
};

exports.get = async (condition) => {
  return User.findAll(condition);
};

exports.update = async (id, data) => {
  return User.update(data, { where: { id } });
};

exports.remove = async (id) => {
  return User.destroy({ where: { id } });
};
