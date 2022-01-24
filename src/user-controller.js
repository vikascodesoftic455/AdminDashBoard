const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");

let geoip = require("geoip-lite");

const {
  sendEmail,
  sendEmailOtpLink,
  sendEmailLink,
  sendEmailContactUs,
} = require("../services/mail.service");
const {
  forgetHTML,
  signupHTML,
  loginMailHTML,
  contactMailHTML,
} = require("../tempalates/signUpHtml");

const { generateOTP } = require("../util/genarateOtp");

const { validationResult } = require("express-validator");
const User = require("../models/user-schema");
const Notification = require("../models/notifications-schema");

const Product = require("../models/product-schema");
const FcmIds = require("../models/fcmids-schema");
const Contact = require("../models/contactus-schema");

const HttpError = require("../middleware/http-error");

const { v1: uuid } = require("uuid");

//user signup

const createUser = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors);
    const error = new HttpError(
      "invalid input are passed,please pass valid data",
      422
    );
    return next(error);
  }
  const {
    name,
    email,
    dob,
    gender,
    password,
    nationality,
    country,
    countryTwoLetterCode,
    nickname,
    countryCode,
    phoneNumber,
  } = req.body;

  let geo = geoip.lookup(req.ip);
  const browser = req.headers["user-agent"];
  const ip = JSON.stringify(req.ip);

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = await new HttpError(
      "something went wrong,creating a user failed",
      500
    );
    return next(error);
  }
  if (existingUser) {
    const error = new HttpError("user already exists", 422);
    return next(error);
  }

  let hashedPassword;

  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    const error = new HttpError("could not create user", 500);
    return next(error);
  }

  let otp;
  let html;
  try {
    otp = generateOTP();
    html = signupHTML(name, otp, email);
    await sendEmail(email, html);
  } catch (err) {
    const error = new HttpError("could not genrate otp", 500);
    return next(error);
  }

  const createdUser = new User({
    name,
    email,
    dob,
    password: hashedPassword,
    countryCode,
    countryTwoLetterCode,
    phoneNumber,
    ip,
    nationality,
    country,
    nickname,
    gender,
    browser,
    otpHex: otp,
  });

  try {
    await createdUser.save();
  } catch (err) {
    const error = new HttpError("Creating User failed, please try again.", 500);
    console.log(err);
    return next(error);
  }

  let token;
  try {
    token = await jwt.sign(
      {
        userId: createdUser.id,
        email: createdUser.email,
      },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (err) {
    const error = new HttpError("Creating User failed, please try again.", 500);
    return next(error);
  }

  res
    .status(201)
    .json({
      userId: createdUser.id,
      email: createdUser.email,
      countrycode: createdUser.countryCode,
      phoneNumber: createdUser.phoneNumber,
      token: token,
    });
};

//Customer login
const userLogin = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors);
    const error = new HttpError(
      "invalid input are passed,please pass valid data",
      422
    );
    return next(error);
  }

  const { email, password, fcmToken } = req.body;

  let user;
  try {
    user = await User.findOne({ email: email });
  } catch (err) {
    const error = await new HttpError(
      "something went wrong,logging in failed",
      500
    );
    return next(error);
  }

  if (!user) {
    const error = new HttpError("invalid credentials could not log in", 401);
    return next(error);
  }

  //checking for verified status

  if (user.isVerified != true) {
    const error = new HttpError(
      "please activate your account , check your email",
      401
    );

    //resending email
    let otp;
    let html;
    try {
      otp = generateOTP();
      html = loginMailHTML(otp, email);

      let updatedRecord = {
        otpHex: otp,
      };

      await User.findByIdAndUpdate(
        user,
        { $set: updatedRecord },
        { new: true }
      );
      await sendEmail(email, html);
    } catch (err) {
      const error = new HttpError("could not genrate otp", 500);
      return next(error);
    }
    return next(error);
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, user.password);
  } catch (err) {
    const error = await new HttpError("invalid credentials try again", 500);
    return next(error);
  }

  if (!isValidPassword) {
    const error = new HttpError("invalid credentials could not log in", 401);
    return next(error);
  }

  //fcm token update on User Model

  try {
    let updatedRecord = {
      fcmToken: fcmToken,
    };
    await User.findByIdAndUpdate(user, { $set: updatedRecord }, { new: true });
  } catch (err) {
    console.log(err);
    const error = await new HttpError(
      "fcmtoken updation failed, try again",
      500
    );
    return next(error);
  }

  //fcm token update on Fcm Model
  let fcmUser = await FcmIds.findOne({ email: email });

  const createdUser = new FcmIds({
    name: user.name,
    email: user.email,
    fcmToken,
  });

  // here we are updating fcmtoken on fcm model at first we check if user email exits or not if exits it means we have update the token
  // if not we to create a new fcm documen in fcm model

  if (!fcmUser) {
    try {
      createdUser.save();
    } catch (err) {
      console.log(err);
      const error = await new HttpError(
        "fcmtoken updation failed, try again",
        500
      );
      return next(error);
    }
  } else if (fcmUser) {
    try {
      let updatedRecord = {
        fcmToken: fcmToken,
      };

      await FcmIds.findByIdAndUpdate(
        fcmUser,
        { $set: updatedRecord },
        { new: true }
      );
    } catch (err) {
      console.log(err);
      const error = await new HttpError(
        "fcmtoken updation failed, try again",
        500
      );
      return next(error);
    }
  }

  let token;
  try {
    token = await jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        nickname: user.nickname,
        countryTwoLetterCode: user.countryTwoLetterCode,
        country: user.country,
        fcmToken: fcmToken,
      },
      process.env.JWT_KEY,
      { expiresIn: "40380h" }
    );
  } catch (err) {
    const error = new HttpError("LogIn failed, please try again.", 500);
    return next(error);
  }

  //updating auth token
  try {
    let updatedRecord = {
      authToken: token,
    };

    await User.findByIdAndUpdate(user, { $set: updatedRecord }, { new: true });
  } catch (err) {
    console.log(err);
    const error = await new HttpError(
      "authtoken updation failed, try again",
      500
    );
    return next(error);
  }

  console.log("logged in");
  res.json({
    message: "user logged in successful",
    userId: user.id,
    email: user.email,
    name: user.name,
    nickname: user.nickname,
    countryTwoLetterCode: user.countryTwoLetterCode,
    country: user.country,
    fcmToken: fcmToken,
    token: token,
  });
};

const getUserInfo = async (req, res) => {
  await User.findOne({
    where: { id: req.userData.userId },
    attributes: { exclude: "password" },
  })
    .then((user) => {
      return res.status(200).json({ result: user });
      console.log(user);
    })
    .catch((err) => {
      return res.status(400).json({ msg: err.toString() });
    });
};

//update password

const updateUserPassword = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors);
    const error = new HttpError(
      "invalid input are passed,please pass valid data",
      422
    );
    return next(error);
  }
  const { email, oldpassword, newpassword } = req.body;

  let user;
  try {
    user = await User.findOne({ email: email });
  } catch (err) {
    const error = await new HttpError(
      "something went wrong,update password in failed",
      500
    );
    return next(error);
  }

  if (!user) {
    const error = new HttpError(
      "user not found could not update password",
      401
    );
    return next(error);
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(oldpassword, user.password);
  } catch (err) {
    const error = await new HttpError("invalid password try again", 500);
    return next(error);
  }

  if (!isValidPassword) {
    const error = new HttpError(
      "invalid old password could not update newpassword",
      401
    );
    return next(error);
  }

  let hashedPassword;

  try {
    hashedPassword = await bcrypt.hash(newpassword, 12);
    let founduser;
    founduser = await User.findOne({ email: email });

    let updatedRecord = {
      password: hashedPassword,
    };

    User.findByIdAndUpdate(
      founduser,
      { $set: updatedRecord },
      { new: true },
      (err, docs) => {
        if (!err) res.json({ mesage: "password updated sucessfully" });
        else
          console.log(
            "Error while updating a record : " +
              JSON.stringify(err, undefined, 2)
          );
      }
    );
  } catch (err) {
    const error = new HttpError("could not updated hash of user ", 500);
    return next(error);
  }
};

// forget Password otp email verfication

const forgetPassword = async (req, res) => {
  const { email } = req.body;
  if (email) {
    try {
      const user = await User.findOne({
        email,
      });
      if (!user) {
        return res.send({ code: 404, msg: "User not found" });
      }
      const otp = generateOTP();
      const html = forgetHTML(user.name, otp);

      await User.updateOne({ _id: user._id }, { otpHex: otp });
      await sendEmail(user.email, html);

      return res.send({
        code: 200,
        email: user.email,
        msg: "OTP send to Your Email.",
      });
    } catch (err) {
      console.log(err);
      return res.send({ code: 500, msg: "Internal server error" });
    }
  }
  return res.send({
    code: 400,
    msg: "Email is required",
  });
};

//rest opt password -rest link using node mailer

const passwordResetotpLink = async (req, res) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
    }
    const token = buffer.toString("hex");
    User.findOne({ email: req.body.email }).then((user) => {
      if (!user) {
        return res
          .status(422)
          .json({ error: "User dont exists with that email" });
      }
      user.resetToken = token;
      user.expireToken = Date.now() + 3600000;
      user.save().then((result) => {
        sendEmailOtpLink(user.email, token);
        res.json({ message: "check your email" });
      });
    });
  });
};

//new password after reciveing link

const newPassword = async (req, res) => {
  const newPassword = req.body.password;
  const sentToken = req.body.token;

  User.findOne({ resetToken: sentToken, expireToken: { $gt: Date.now() } })
    .then((user) => {
      if (!user) {
        return res.status(422).json({ error: "Try again session expired" });
      }
      bcrypt.hash(newPassword, 12).then((hashedpassword) => {
        user.password = hashedpassword;
        user.resetToken = undefined;
        user.expireToken = undefined;
        user.save().then((saveduser) => {
          res.json({ message: "password updated success" });
        });
      });
    })
    .catch((err) => {
      console.log(err);
    });
};

//verify otp
const otpVerify = async (req, res) => {
  const { otp, email, password } = req.body;
  const newPassword = req.body.password;

  if (otp && email) {
    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.send({ code: 404, msg: "User not Found" });
      }
      if (user.otpHex !== otp) return res.send({ code: 400, msg: "Wrong OTP" });
      bcrypt.hash(newPassword, 12).then((hashedpassword) => {
        user.password = hashedpassword;
        user.resetToken = undefined;
        user.expireToken = undefined;
        user.save().then((saveduser) => {
          return res.json({ message: "password updated success" });
        });
      });
    } catch (err) {
      sentryCapture(err);
      console.log(err);
      return res.send({ code: 500, msg: "Internal Server Error" });
    }
  }
};

// post product

const createProduct = async (req, res, next) => {
  const errors = validationResult(req);

  const files = req.files.imgOptOne;
  const fileSingle = req.files.image;

  let finalImages = [];
  let SingleFilePath;
  let imgPath;

  if (files) {
    files.forEach((img) => {
      console.log(img.path);
      imgPath = img.path;
      finalImages.push(imgPath);
    });
  }

  if (!fileSingle) {
    const error = new Error("please single choose files");
    return next(error);
  }

  fileSingle.forEach((img) => {
    console.log(img.path);
    imgPath = img.path;
    SingleFilePath = imgPath;
  });

  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const {
    title,
    description,
    modelNumber,
    category,
    subcategory,
    recommendCategory,
    recommendSubcategory,
    isFeatured,
    quantity,
    categoryId,
  } = req.body;

  const creator = req.userData.userId;

  let RecommendSubs = [];
  RecommendSubs = recommendSubcategory.split(",");
  console.log(RecommendSubs);

  let user;
  try {
    user = await User.findById(creator);
  } catch (err) {
    const error = new HttpError(
      "Creating product failedl, please try again",
      500
    );
    console.log("error ");
    return next(error);
  }

  if (!user) {
    const error = new HttpError("Could not find user for provided id", 404);
    return next(error);
  }

  const Nickname = user.nickname;
  const Country = user.country;
  const CountryTwoLetterCode = user.countryTwoLetterCode;

  const createdProduct = new Product({
    title,
    description,
    modelNumber,
    categoryId,
    category,
    subcategory,
    recommendCategory,
    recommendSubcategory: RecommendSubs,
    image: SingleFilePath,
    imgOptOne: finalImages,
    creator,
    isFeatured,
    quantity,
    nickname: Nickname,
    country: Country,
    countryTwoLetterCode: CountryTwoLetterCode,
    productid: uuid(),
  });

  /// checking balance and decrementing by -1 from balance after posting product  if no bal message error to purchase plan
  let userBal;
  try {
    userBal = await User.findOne({ _id: creator, Balance: { $lte: 0 } });
  } catch (err) {
    const error = new HttpError("Balnce checking , please try again", 500);
    console.log("error ");
    return next(error);
  }

  if (userBal) {
    const error = new HttpError("purchase plan", 404);
    return next(error);
  }

  //check if userwants to feauture product or not if he wants to feature product then his balance will be deducted by -2 if he doesnt then -1

  if (isFeatured === "true") {
    console.log("isFeautured is " + isFeatured);
    try {
      const sess = await mongoose.startSession();
      sess.startTransaction();
      await createdProduct.save({ session: sess });
      user.inventory.push(createdProduct);
      await user.save({ session: sess });
      await sess.commitTransaction();

      await User.findByIdAndUpdate(
        { _id: creator },
        { userType: "Vendor", isFeatured: true, $inc: { Balance: -2 } }
      );
    } catch (err) {
      console.log(err);
      const error = new HttpError(
        "Creating product failed, please try again.",
        500
      );
      return next(error);
    }

    res.status(201).json({ product: createdProduct });
  } else {
    console.log("isFeautured is " + isFeatured);
    try {
      const sess = await mongoose.startSession();
      sess.startTransaction();
      await createdProduct.save({ session: sess });
      user.inventory.push(createdProduct);
      await user.save({ session: sess });
      await sess.commitTransaction();

      await User.findByIdAndUpdate(
        { _id: creator },
        { userType: "Vendor", isFeatured: false }
      );
    } catch (err) {
      console.log(err);
      const error = new HttpError(
        "Creating product failed, please try again.",
        500
      );
      return next(error);
    }

    res.status(201).json({ product: createdProduct, Balance: user.Balance });
  }
};

//get products by creatorId(objectId of user)

const getProductsByUserId = async (req, res, next) => {
  const creator = req.params.uid;

  // replace add userId login after auth protect
  // const creator = req.body;

  // let Products;
  let userWithProducts;
  try {
    userWithProducts = await User.findById(creator).populate("inventory");
  } catch (err) {
    const error = new HttpError(
      "Fetching places failed, please try again later",
      500
    );
    return next(error);
  }

  // if (!products || products.length === 0) {
  if (!userWithProducts || userWithProducts.inventory.length === 0) {
    return next(
      new HttpError("Could not find products for the provided user id.", 404)
    );
  }

  res.json({
    inventory: userWithProducts.inventory.map((product) =>
      product.toObject({ getters: true })
    ),
  });
};

//get product by id
const getProductById = async (req, res, next) => {
  const productId = req.params.pid;

  let product;
  try {
    product = await Product.findById(productId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find a product.",
      500
    );
    return next(error);
  }

  if (!product) {
    const error = new HttpError(
      "Could not find a product for the provided id.",
      404
    );
    return next(error);
  }

  res.json({ product: product.toObject({ getters: true }) });
};

//get  Balance

const getBalanceById = async (req, res, next) => {
  const userId = req.userData.userId;

  let user;
  try {
    user = await User.findById(userId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find a user.",
      500
    );
    return next(error);
  }

  if (!user) {
    const error = new HttpError(
      "Could not find a user for the provided id.",
      404
    );
    return next(error);
  }

  res.json({ Balance: user.Balance || 0 });
};

//get notifaction by userId
const getNotificationsByUserID = async (req, res, next) => {
  const userId = req.userData.userId;

  let user;
  try {
    user = await User.findById(userId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find a user.",
      500
    );
    return next(error);
  }

  if (!user) {
    const error = new HttpError(
      "Could not find a user for the provided id.",
      404
    );
    return next(error);
  }

  let userWithNotifications;
  try {
    userWithNotifications = await User.findById(user).populate("notifications");
  } catch (err) {
    const error = new HttpError(
      "Fetching notifications failed, please try again later",
      500
    );
    return next(error);
  }

  // if (!products || products.length === 0) {
  if (
    !userWithNotifications ||
    userWithNotifications.notifications.length === 0
  ) {
    return next(
      new HttpError(
        "Could not find notifications for the provided user id.",
        404
      )
    );
  }

  let userWithNotificationsCount;
  try {
    userWithNotificationsCount = await User.findById(user)
      .populate("notifications")
      .countDocuments();
  } catch (err) {
    const error = new HttpError(
      "Fetching notifications count failed, please try again later",
      500
    );
    return next(error);
  }

  res.json({
    notifications: userWithNotifications.notifications.map((notification) =>
      notification.toObject({ getters: true })
    ),
    count: userWithNotificationsCount,
  });
};

//email verification by otp
const EmailotpVerify = async (req, res) => {
  const otp = req.query.otpId;
  const email = req.query.emailId;

  if (otp && email) {
    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.send({ code: 404, msg: "User not Found" });
      }
      if (user.otpHex !== otp) return res.send({ code: 400, msg: "Wrong OTP" });

      user.otpHex = undefined;
      user.isVerified = true;
      user.save().then((status) => {
        return res.redirect("/emailVerifedsucessfully.html");
      });
    } catch (err) {
      sentryCapture(err);
      console.log(err);
      return res.send({ code: 500, msg: "Internal Server Error" });
    }
  }
};

//users registered but did not post an item
const getListofCustomers = async (req, res, next) => {
  let users;
  try {
    users = await User.find(
      { userType: "Customer" },
      { name: 1, email: 1, userType: 1, isVerified: 1, nationality: 1, _id: 0 }
    );
    if (!users || users.length === 0) {
      return next(new HttpError("there are no users with this type", 404));
    }
  } catch (err) {
    const error = new HttpError(
      "can not fetch users by provided type, something went wrong",
      500
    );
    return next(error);
  }

  res.json({ users: users });
};

//getListofVendors registered but did not post an item
const getListofVendors = async (req, res, next) => {
  let users;
  try {
    users = await User.find(
      { userType: "Vendor" },
      { name: 1, email: 1, userType: 1, isVerified: 1, nationality: 1, _id: 0 }
    );
    if (!users || users.length === 0) {
      return next(new HttpError("there are no users with this type", 404));
    }
  } catch (err) {
    const error = new HttpError(
      "can not fetch users by provided type, something went wrong",
      500
    );
    return next(error);
  }

  res.json({ users: users });
};

//getListofUsers registered but did not post an item
const getListofUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find(
      {},
      { name: 1, email: 1, userType: 1, fcmToken: 1, _id: 0 }
    );
    if (!users || users.length === 0) {
      return next(new HttpError("there are no users ", 404));
    }
  } catch (err) {
    console.log(err);
    const error = new HttpError(
      "can not fetch users , something went wrong",
      500
    );
    return next(error);
  }

  res.json({ users: users });
};

//no of customers count
const getCustomerCount = async (req, res, next) => {
  let users;
  try {
    users = await User.find({ userType: "Customer" }).countDocuments();
  } catch (err) {
    const error = new HttpError("can not fetch users request", 500);
    return next(error);
  }
  res.json({ users: users });
};

//no of vendors count
const getVendorsCount = async (req, res, next) => {
  let vendors;
  try {
    vendors = await User.find({ userType: "Vendor" }).countDocuments();
  } catch (err) {
    const error = new HttpError("can not fetch vendors request", 500);
    return next(error);
  }
  res.json({ vendors: vendors });
};

//create contact us

const ContactUs = async (req, res, next) => {
  const errors = validationResult(req);
  let InvalidInputTYPE = [];
  let InvalidInputValue = [];

  if (!errors.isEmpty()) {
    let ErrorsArray = errors.array();
    ErrorsArray.map((err, i) => {
      InvalidInputTYPE.push(`${err.param}`);
      InvalidInputValue.push(`${err.value}`);
    });

    const error = new HttpError(
      `invalid input types are : ${InvalidInputTYPE} , contains value : ${InvalidInputValue}`,
      500
    );
    return next(error);
  }
  const { Name, Number, Email, Subject, Message } = req.body;

  const createdTicket = new Contact({
    Name,
    Number,
    Email,
    Subject,
    Message,
  });

  try {
    await createdTicket.save();
  } catch (err) {
    const error = new HttpError(
      "Creating Contact us failed, please try again.",
      500
    );
    console.log(err);
    return next(error);
  }

  let html;
  try {
    html = contactMailHTML(Name, Number, Email, Subject, Message);

    let email = "care@badilnyint.com";
    await sendEmailContactUs(html);
  } catch (err) {
    const error = new HttpError("could not send mail", 500);
    return next(error);
  }

  res.status(201).json({ contactUs: createdTicket });
};

//get contact us

const getContactUs = async (req, res, next) => {
  let ticket;
  try {
    ticket = await Contact.find({});
    if (!ticket || ticket.length === 0) {
      return next(new HttpError("there are no ticket ", 404));
    }
  } catch (err) {
    console.log(err);
    const error = new HttpError(
      "can not fetch ticket , something went wrong",
      500
    );
    return next(error);
  }
  res.json({ contactUs: ticket });
};

//user signup
exports.createUser = createUser;
//user login
exports.userLogin = userLogin;
//update user password based on old password
exports.updateUserPassword = updateUserPassword;
//forget password
exports.forgetPassword = forgetPassword;
//post product
exports.createProduct = createProduct;
//get products by creator id
exports.getProductsByUserId = getProductsByUserId;
//get product by product id
exports.getProductById = getProductById;

//nnew password
exports.newPassword = newPassword;

exports.passwordResetotpLink = passwordResetotpLink; //passwordd rest link using nodemailer

//otp verify
exports.otpVerify = otpVerify;

//get Balance
exports.getBalanceById = getBalanceById;

//get notfication by userId
exports.getNotificationsByUserID = getNotificationsByUserID;

//get userInfo
exports.getUserInfo = getUserInfo;

//email verfication
exports.EmailotpVerify = EmailotpVerify;

//get list of customers
exports.getListofCustomers = getListofCustomers;

//get list of vendors
exports.getListofVendors = getListofVendors;

//get list of users
exports.getListofUsers = getListofUsers;

//get count of customers
exports.getCustomerCount = getCustomerCount;

//get count of vendors
exports.getVendorsCount = getVendorsCount;

//createContactUs
exports.ContactUs = ContactUs;

//get contact
exports.getContactUs = getContactUs;
