const jwt = require("jsonwebtoken");
const userService = require("./../modules/user/service");
const adminService = require("./../modules/admin/service");

exports.singIdToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRETE, {
    expiresIn: process.env.JWT_EXPIREIN,
  });
};

exports.singMobileToken = (mobile, isVerified) => {
  return jwt.sign({ mobile, isVerified }, process.env.JWT_SECRETE, {
    expiresIn: process.env.JWT_EXPIREIN,
  });
};

exports.mobileProtected = async (req, res, next) => {
  try {
    if (
      req.headers.authorization != null &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      const token = req.headers.authorization.split(" ")[1];

      const jwtUser = await jwt.verify(token, process.env.JWT_SECRETE);

      const mobile = jwtUser.mobile;

      if (mobile) {
        req.requestor = jwtUser;
        next();
      } else {
        res.status(401).json({
          status: "fail",
          message: "user not authorized",
        });
      }
    } else {
      res.status(404).json({
        status: "fail",
        message: "token not found",
      });
    }
  } catch (error) {
    console.error(error);
    return next(createError(404, error));
  }
};

exports.authMiddleware = async (req, res, next) => {
  if (req.headers.authorization == null)
    return next(createError(401, "Not Authorized"));

  if (!req.headers.authorization.startsWith("Bearer"))
    return res.status(401).json({
      status: "fail",
      message: "Bearer Token Must Be Required",
    });

  const token = req.headers.authorization.split(" ")[1];
  try {
    const jwtUser = await jwt.verify(token, process.env.JWT_SECRETE);

    let requestor;
    if (jwtUser.role === "Admin") {
      [requestor] = await adminService.get({
        where: {
          id: jwtUser.id,
        },
      });
      requestor.role = "Admin";
    } else {
      [requestor] = await userService.get({
        where: {
          id: jwtUser.id,
        },
      });

      requestor.role = "User";
    }
    if (!requestor) {
      res.status(401).json({
        status: "fail",
        message: "User not found",
      });
    } else {
      req.requestor = requestor;
      next();
    }
  } catch (error) {
    console.log(error);
    res.status(401).json({
      status: "fail",
      message: "User not authorized",
    });
  }
};

exports.verifiedCheck = async (req, res, next) => {
  try {
    if (
      req.headers.authorization != null &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      const token = req.headers.authorization.split(" ")[1];
      const jwtUser = await jwt.verify(token, process.env.JWT_SECRETE);

      if (jwtUser.isVerified) {
        req.requestor = jwtUser;
        next();
      } else {
        res.status(401).json({
          status: "fail",
          message: "user not verified",
        });
      }
    } else {
      res.status(404).json({
        status: "fail",
        message: "token not found",
      });
    }
  } catch (error) {
    res.status(401).json({
      status: "fail",
      message: error,
    });
  }
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.requestor.role)) {
      res.status(401).json({
        status: "fail",
        message: ` ${req.requestor.role}  are not authorized for  this portion`,
      });
    } else {
      next();
    }
  };
};
