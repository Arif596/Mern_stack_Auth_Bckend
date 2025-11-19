const { ErrorHandler } = require("../Middleware/ErrorMiddleware.js");
const catchAsyncError = require("../Middleware/CathAsynchError.js");
const User = require("../Model/UserModel");
const sendEmail = require("../Utils/SendEmail");
const twilio = require("twilio");
const sendToken = require("../Utils/SendToken.js");
const crypto = require("crypto");
const multer=require("multer");
const path=require("path")
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

const register = catchAsyncError(async (req, res, next) => {
  const { name, email, phone, password, verificationMethod } = req.body;

  if (!name || !email || !phone || !password || !verificationMethod) {
    return next(new ErrorHandler("All fields are required", 400));
  }

  const phoneRegex = /^\+923\d{9}$/;
  if (!phoneRegex.test(phone)) {
    return next(
      new ErrorHandler(
        "Invalid phone number format. Example: +923001234567",
        400
      )
    );
  }

  const existingUser = await User.findOne({
    $or: [
      { email, accountVerified: true },
      { phone, accountVerified: true },
    ],
  });

  if (existingUser) {
    return next(new ErrorHandler("Phone or Email already used", 400));
  }

  const registrationAttempts = await User.find({
    $or: [
      { phone, accountVerified: false },
      { email, accountVerified: false },
    ],
  });

  if (registrationAttempts.length > 3) {
    return next(
      new ErrorHandler(
        "You have exceeded the maximum attempts (3). Please try again after an hour.",
        400
      )
    );
  }

  const user = await User.create({ name, email, phone, password });
  const verificationCode = await user.generateVerificationCode();
  await user.save();

  // get message from helper
  const message = await sendVerificationCode(
    verificationMethod,
    verificationCode,
    email,
    name,
    phone
  );

  res.status(200).json({ success: true, message });
});

async function sendVerificationCode(
  verificationMethod,
  verificationCode,
  email,
  name,
  phone
) {
  if (verificationMethod === "email") {
    const message = generateEmailTemplate(verificationCode);
    await sendEmail({ email, subject: "Your Verification Code", message });
    return `Verification email sent successfully to ${name}`;
  }
  // OTP With Call
  else if (verificationMethod === "phone") {
    const verificationCodeWithSpace = verificationCode
      .toString()
      .split("")
      .join(" ");
    await client.calls.create({
      twiml: `<Response><Say voice="alice">Your Verification Code is ${verificationCodeWithSpace}</Say></Response>`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    return "OTP sent successfully via phone";
  }
  // OTP recieved with Message
  // else if(verificationMethod==="phone"){
  // const smsMessage=`Your Verification Code is:${verificationCode}`
  // await client.messages.create({
  //   body:smsMessage,
  //   from:process.env.TWILIO_PHONE_NUMBER,
  //   to:phone
  // })
  // return "OTP Sent Successfully Via Sms"
  // }
  else {
    throw new ErrorHandler(
      "Invalid verification method. Please try again.",
      500
    );
  }
}

function generateEmailTemplate(verificationCode) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #4CAF50;">Welcome to Our App!</h2>
      <p>Thank you for registering. Please use the following verification code to verify your account:</p>
      <p style="font-size: 20px; font-weight: bold; background-color: #f2f2f2; padding: 10px; display: inline-block;">
        ${verificationCode}
      </p>
      <p>This code is valid for the next 10 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
      <hr />
      <p style="font-size: 12px; color: #777;">&copy; ${new Date().getFullYear()} Our App. All rights reserved.</p>
    </div>
  `;
}
// // OTP Verification Method
// const OTPVerification = catchAsyncError(async (req, res, next) => {
//   const { email, otp, phone } = req.body;
//   const phoneRegex = /^\+923\d{9}$/;
//   if (!phoneRegex.test(phone)) {
//     return next(
//       new ErrorHandler(
//         "Invalid phone number format. Example: +923001234567",
//         400
//       )
//     );
//   }
//   try {
//     const userAllEntries = await User.find({
//       $or: [
//         {
//           email,
//           accountVerified: false,
//         },
//         {
//           phone,
//           accountVerified: false,
//         },
//       ],
//     }).sort({createdAt:-1});
//     if(!userAllEntries){
//     return next(new ErrorHandler("User not Found",400))
//     }
//     let user;
//     if(userAllEntries.length>1){
//       user=userAllEntries[0];
//       await User.deleteMany({
//         _id:{$ne:user_id},
//         $or:[
//           {phone,accountVerified:false},
//           {email,accountVerified:false}
//         ]
//       })
//     }
//     else{
//       user=userAllEntries[0]
//     }
//     if(user.verificationCode!==Number(otp)){
//       return next(new ErrorHandler("Invalid OTP",400))
//     }
//     const currentTime=Date.now();
//     const verificationCodeExpire=new Date(user.verificationCodeExpire).getTime();
//     console.log(currentTime);
//     console.log(verificationCodeExpire);
//     if(currentTime>verificationCodeExpire){
//       return next(new ErrorHandler("Expired OTP",400))
//     }
//   } catch (error) {}
// });
const OTPVerification = catchAsyncError(async (req, res, next) => {
  const { email, otp, phone } = req.body;

  const phoneRegex = /^\+923\d{9}$/;
  if (!phoneRegex.test(phone)) {
    return next(
      new ErrorHandler(
        "Invalid phone number format. Example: +923001234567",
        400
      )
    );
  }

  const userAllEntries = await User.find({
    $or: [
      { email, accountVerified: false },
      { phone, accountVerified: false },
    ],
  }).sort({ createdAt: -1 });

  if (!userAllEntries || userAllEntries.length === 0) {
    return next(new ErrorHandler("User not Found", 400));
  }

  let user;
  if (userAllEntries.length > 1) {
    user = userAllEntries[0];
    await User.deleteMany({
      _id: { $ne: user._id },
      $or: [
        { phone, accountVerified: false },
        { email, accountVerified: false },
      ],
    });
  } else {
    user = userAllEntries[0];
  }

  if (Number(user.verificationCode) !== Number(otp)) {
    return next(new ErrorHandler("Invalid OTP", 400));
  }

  const currentTime = Date.now();
  const verificationCodeExpire = new Date(
    user.verificationCodeExpire
  ).getTime();

  if (currentTime > verificationCodeExpire) {
    return next(new ErrorHandler("Expired OTP", 400));
  }

  user.accountVerified = true;
  user.verificationCode = null;
  user.verificationCodeExpire = null;
  await user.save({ validateModifiedOnly: true });

  // ✅ Return token and user info in one unified response
  sendToken(user, 200, "OTP verified successfully", res);
});
// Login
const LoginUser = catchAsyncError(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ErrorHandler("Email and Password are required", 400));
  }

  const user = await User.findOne({ email, accountVerified: true }).select(
    "+password"
  );

  if (!user) {
    return next(new ErrorHandler("Invalid email or password", 401));
  }

  const isPasswordMatched = await user.matchPassword(password);
  if (!isPasswordMatched) {
    return next(new ErrorHandler("Invalid email or password", 401));
  }

  sendToken(user, 200, "Login Successfully", res);
});
// Logout
const LogoutUser = catchAsyncError(async (req, res, next) => {
  res
    .status(200)
    .cookie("AuthToken", "", {
      expires: new Date(Date.now()),
      httpOnly: true,
    })
    .json({
      success: true,
      message: "Logout successfully",
    });
});
// Get User
const GetUser = catchAsyncError(async (req, res, next) => {
  const user = req.user;
  res.status(200).json({ success: true, user });
});
// Forget Password
const Forgetpassword = catchAsyncError(async (req, res, next) => {
  const user = await User.findOne({
    email: req.body.email,
    accountVerified: true,
  });
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }
  const resetToken = user.generateResetPassword();
  await user.save({ validateBeforeSave: false });
  const resetPasswordUrl = `${process.env.FRONTEND_URL}/password/reset/${resetToken}`;
  const message = `Your password reset link is:\n\n${resetPasswordUrl}\n\nIf you did not request this email, please ignore it.`;
  try {
    await sendEmail({
      email: user.email,
      subject: "MERN Authentication App - Password Reset",
      message,
    });

    res.status(200).json({
      success: true,
      message: `Email sent successfully to ${user.email}`,
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new ErrorHandler(error.message || "Cannot send reset password email", 500)
    );
  }
});
// Reset Password
const resetPassword = catchAsyncError(async (req, res, next) => {
  const { token } = req.params;
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(
      new ErrorHandler("Reset password token is invalid or expired", 400)
    );
  }
  if (req.body.password !== req.body.confirmPassword) {
    return next(new ErrorHandler("Passwords do not match", 400));
  }
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();
  sendToken(user, 200, "Password reset successfully", res);
});

const GetAllUser = async (req, res, next) => {
  const user = await User.find({});
  res.status(200).json({ message: "User Finds Successfully", success: true,user });
};
const storage=multer.diskStorage({
  destination:(req,res,cb)=>{
    cb(null,"uploads/")
  },
  filename:(req,file,cb)=>{
    cb(null,Date.now()+path.extname(file.originalname))
  }
});
const upload=multer({storage});
const UploadFile=catchAsyncError(async(req,res,next)=>{
const user=await User.findById(req.body.userId);
if(!user){
  return next(new ErrorHandler("User not found",404))
}
user.profilePic=`/uploads/${req.file.filename}`;
await user.save()
res.status(200).json({
  success:true,
  message:"Profile Uploaded Successfully",
  profilePic:user.profilePic
})
})
module.exports = {
  register,
  OTPVerification,
  LoginUser,
  LogoutUser,
  GetUser,
  Forgetpassword,
  resetPassword,
  GetAllUser,
  upload,UploadFile
};
