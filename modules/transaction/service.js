const Post = require("./model");

exports.create = async (data) => {
  return Post.create(data);
};

exports.get = async (condition) => {
  return Post.findAll(condition);
};
exports.getSum = async (condition) => {
  return Post.sum(condition);
};

exports.update = async (data, condition) => {
  return Post.update(data, condition);
};

exports.remove = async (condition) => {
  return Post.destroy(condition);
};
