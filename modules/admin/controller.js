const service = require("./service");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const [admin] = await service.get({
      where: {
        email,
      },
    });
    const correctPassword = await bcrypt.compare(password, admin.password);
    if (admin && correctPassword) {
      const token = jwt.sign(
        { id: admin.id, role: "Admin" },
        process.env.JWT_SECRETE,
        {
          expiresIn: process.env.JWT_EXPIREIN,
        }
      );

      res.status(200).json({
        status: "success",
        message: "Admin login successfully",
        token,
      });
    } else {
      res.status(401).json({
        status: "fail",
        message: "Admin login fail bcz id and password doesn't match",
      });
    }
  } catch (error) {
    next(error);
  }
};

exports.signup = async (req, res, next) => {
  try {
    const data = await service.create(req.body);

    res.status(200).send({
      status: "success",
      message: "Admin signup Successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const data = await service.get({
      where: {
        id: req.requestor.id,
      },
    });

    res.status(200).send({
      status: "success",
      message: "getMe successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};
