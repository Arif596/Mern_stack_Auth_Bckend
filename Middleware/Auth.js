const { ErrorHandler } = require("../Middleware/ErrorMiddleware.js");
const catchAsyncError = require("../Middleware/CathAsynchError.js");
const User = require("../Model/UserModel");
const jwt=require("jsonwebtoken")
const isAuthenticated=catchAsyncError(async(req,res,next)=>{
    const{AuthToken}=req.cookies;
    if(!AuthToken){
        return next(new ErrorHandler("User is not Authenticated",400))
    }
    const decoed=jwt.verify(AuthToken,process.env.JWT_SECRET_KEY);
    req.user=await User.findById(decoed.id);
    next()
})
module.exports={isAuthenticated}
