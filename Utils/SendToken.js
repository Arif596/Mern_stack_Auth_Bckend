const sendToken = (user, statusCode, message, res) => {
  const token = user.generateToken();
console.log(token)
  res
    .status(statusCode)
    .cookie("AuthToken", token, { 
      expires: new Date(Date.now() + Number(process.env.COOKIE_EXPIRE) * 24 * 60 * 60 * 1000),
      httpOnly: true,
    })
    .json({
      success: true, 
      message,
      token,
      user:{
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      accountVerified: user.accountVerified,
      },
    });
};

module.exports = sendToken;
