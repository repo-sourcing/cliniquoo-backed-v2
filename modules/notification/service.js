const Notification = require("./model");

exports.create = async (data) => {
  return Notification.create(data);
};

exports.get = async (condition) => {
  return Notification.findAll(condition);
};

exports.update = async (id, data) => {
  return Notification.update(data, { where: { id } });
};

exports.remove = async (condition) => {
  return Notification.destroy(condition);
};
