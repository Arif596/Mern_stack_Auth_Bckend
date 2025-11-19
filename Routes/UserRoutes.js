const express=require('express');
const { register, OTPVerification, LoginUser, LogoutUser, GetUser, Forgetpassword, resetPassword, GetAllUser, UploadFile, upload } = require('../Controllers/UserController');
const { isAuthenticated } = require('../Middleware/Auth');
const router=express.Router();
router.post('/register',register);
router.post('/otp-verification',OTPVerification);
router.post('/login',LoginUser);
router.get('/logout',isAuthenticated,LogoutUser);
router.get('/get-user',isAuthenticated,GetUser);
router.post("/password/forget",Forgetpassword);
router.put('/password/reset/:token',resetPassword)
router.get('/get-all-users',GetAllUser);
router.post("/upload-profile", upload.single("profilePic"), UploadFile);

module.exports=router