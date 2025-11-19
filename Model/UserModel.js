const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [8, "Password must be at least 8 characters"],
    maxlength: [100, "Password cannot exceed 100 characters"],
    select: false,
  },
  phone: {
    type: String,
    required: [true, "Phone is required"],
  },
  accountVerified: {
    type: Boolean,
    default: false,
  },
  profilePic:{type:String,default:""},
  verificationCode: Number,
  verificationCodeExpire: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};
// userSchema.methods.generateVerificationCode=function(){
//   function generateRendomFiveDigitNumber(){
//     const firstDigit=Math.floor(Math.random()*9)+1;
//     const remainingDigit=Math.floor(Math.random()*10000);
//     return parseInt(firstDigit+remainingDigit);
//   }
//   const verificationCode=generateRendomFiveDigitNumber();
//   this.verificationCode=verificationCode;
//   this.verificationCodeExpire=Date.now() +5*60*1000;
//   return verificationCode;
// }
userSchema.methods.generateVerificationCode = function () {
  function generateRandomFiveDigitNumber() {
    // Generate random number between 10000 and 99999 (inclusive)
    return Math.floor(Math.random() * 90000) + 10000;
  }
  const verificationCode = generateRandomFiveDigitNumber();
  this.verificationCode = verificationCode;
  this.verificationCodeExpire = Date.now() + 10 * 60 * 1000;
  return verificationCode;
};
userSchema.methods.generateToken = function () {
  try {
    // Check if JWT_SECRET_KEY exists
    if (!process.env.JWT_SECRET_KEY) {
      throw new Error("JWT_SECRET_KEY is not defined in environment variables");
    }

    const token = jwt.sign({ id: this._id }, process.env.JWT_SECRET_KEY, {
      expiresIn: process.env.JWT_EXPIRE,
    });

    return token;
  } catch (error) {
    console.error("Token generation error:", error);
    throw new Error("Failed to generate token");
  }
};
userSchema.methods.generateResetPassword = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");

  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

  return resetToken;
};

module.exports = mongoose.model("User", userSchema);
