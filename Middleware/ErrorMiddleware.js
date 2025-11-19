class ErrorHandler extends Error {
  constructor(message, StatusCode) {
    super(message);
    this.StatusCode = StatusCode;
  }
}
const errorMiddleware = (err, req, res, next) => {
  err.StatusCode = err.StatusCode || 500;
  err.message = err.message || "Internal Server Error";

  if (err.name === "CastError") {
    const message = `Invalid ${err.path}`;
    err = new ErrorHandler(message, 400);
  }

  if (err.name === "JsonWebTokenError") {
    const message = `JSON Web Token is Invalid, Try Again`;
    err = new ErrorHandler(message, 400);
  }

  if (err.name === "TokenExpiredError") {
    const message = `JSON Web Token is Expired, Try Again`;
    err = new ErrorHandler(message, 400);
  }

  if (err.code === 11000) {
    const message = `Duplicate ${Object.keys(err.keyValue)} Enter`;
    err = new ErrorHandler(message, 400);
  }

  res.status(err.StatusCode).json({
    success: false,
    message: err.message,
  });
};

module.exports = { errorMiddleware, ErrorHandler };
