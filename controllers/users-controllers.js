const { validationResult } = require('express-validator');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');

// for aws
const AWS = require('aws-sdk');
const fs = require ('fs');
const uuid = require('uuid/v1');

const HttpError = require('../models/http-error');
const User = require('../models/user');
const { ProcessCredentials } = require('aws-sdk');

const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, '-password');
  } catch (err) {
    const error = new HttpError(
      'Fetching users failed, please try again later.',
      500
    );
    return next(error);
  }
  res.json({ users: users.map(user => user.toObject({ getters: true })) });
};

const signup = (req, res, next) => {

// logic for aws:
const s3 = new AWS.S3({
  secretAccessKey: process.env.AWS_SECRET_KEY,
  accessKeyId: process.env.AWS_KEY_ID,
})


readfile=  fs.readFile(req.file.path, (err, fileBody) => {
  console.log('here') ;
  if(err) {
     console.log("Error2", err);
  }  else {
      let params = {
          ACL: "public-read-write",
          Bucket: 'eventsbook22',
          Body: fileBody,
          ContentType: req.file.mimetype,
          Key: uuid()
      };
     console.log('here') ;
      s3.upload(params, async(err, result) => {
          if(err) {
             console.log("Error3", err);
          } else {
              
             console.log("S3 Response",result.Location);
               result.Location
             console.log('bla');



            //  original code:
            const errors = validationResult(req);
            
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    );
  }

  const { name, email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError(
      'Signing up failed, please try again later.',
      500
    );
    return next(error);
  }

  if (existingUser) {
    const error = new HttpError(
      'User exists already, please login instead.',
      422
    );
    return next(error);
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    const error = new HttpError(
      'Could not create user, please try again.',
      500
    );
    return next(error);
  }

  const createdUser = new User({
    name,
    email,
    image: result.Location,
    password: hashedPassword,
    places: []
  });

  try {
    await createdUser.save();
  } catch (err) {
    const error = new HttpError(
      'Signing up failed, please try again later.',
      500
    );
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      { userId: createdUser.id, email: createdUser.email },
      'supersecret_dont_share'
      ,{ expiresIn: '365d' }
    );
  } catch (err) {
    const error = new HttpError(
      'Signing up failed, please try again later.',
      500
    );
    return next(error);
  }

  res
    .status(201)
    .json({ userId: createdUser.id, email: createdUser.email,token: token });


    // THIS SECTION WITH EMAIL I THINK HAS TO BE AFETR RESPONSE IS SENT SO ITS NOT BLOCKING 
    // OUR MAIN CODE EXECUTION IN CASE ITS SLOW 
    //  now we have transporter configured and we want to use it now after
// successfull signup, 
// there is a send Mail method we can execute, to that method you pass 
// javascript object whre you configure the email you want to send, from 
// who and so, also sendMail returns a promise so we can catch errors if we want to
// but the the redirect logic has to be on the top so in case of an error we still get redirected
const transporter = nodemailer.createTransport(
  sendgridTransport({
    auth: {
      // you can use here usrename as well
      api_key: process.env.SENDGRID_API_KEY
    }
  })
);
try{
  await transporter.sendMail({
    to: email,
    from: 'spatulatom@gmail.com',
    subject: 'Konto utworzone!',
    html: '<h1>Konto zostało utorzone na https://familija-fc0e5.web.app/ !</h1>'
  });
}catch(err){
  console.log('ERROR',err);
  return next()

}



          }
      })
      
  }
});

};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  let existingUser;

  try {
    existingUser = await User.findOne({ email: email });
    // you need this extra if otherwise even not existing email makes this
    // try block succesull
if(!existingUser){
      const error = new HttpError(
        'Nie istnieje użytkownik posiadający podany adres email.',
        403
      );
      return next(error);
    }

  } catch (err) {
    const error = new HttpError(
      'Logowanie się nie powiodło. Błąd serwera. Przepraszamy. Spróbuj ponownie za chwilę.',
      500
    );
    return next(error);
  }

  if (!existingUser) {
    const error = new HttpError(
      'Nie istnieje użytkownik posiadający podany adres email.',
      403
    );
    return next(error);
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    const error = new HttpError(
      'Niepoprawne hasło. Jeśli nie pamietasz hasła użyj linku poniżej aby utworzyć nowe.',
      500
    );
    return next(error);
  }

  if (!isValidPassword) {
    const error = new HttpError(
      'Niepoprawne hasło. Jeśli nie pamietasz hasła użyj linku poniżej aby utworzyć nowe.',
      403
    );
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      { userId: existingUser.id, email: existingUser.email },
      'supersecret_dont_share',
      { expiresIn: '365d' }
    );
  } catch (err) {
    const error = new HttpError(
      'Logowanie się nie powiodło. Błąd serwera. Przepraszamy. Spróbuj ponownie za chwilę.',
      500
    );
    return next(error);
  }

  res.json({
    userId: existingUser.id,
    email: existingUser.email,
    token: token
  });
};
 

// to reset password we need to create a uniqe token and assign it to 
// the email we will send now email which upon clcking will 
// send us back another request, so again  from that email  another request
// with that token and email of coures will be sent so we know 
// that the request we recieve is really related
// to our resetting (we cant just let users change their passwords based only 
// on giving us their email)
const reset = async (req,res,next)=>{
  // lets generate that token: import 'crypto' its a library 
  // that helps in creating secure random values - so its not 
  // a token like above we we needed id +email+ secure key, its just 
  // random value that for a while we use, we wont decode it or anything;


 
    let user;
    try{ user =
    await User.findOne({ email: req.body.email }) }
    catch (err){
       const error = new HttpError('Przepraszamy, wystąpił bład serwera. Spróbuj ponownie za chwilę', 500);
    return next(error);}

     // you need this extra if otherwise even not existing email makes this
    // try block succesull;
    // i think findOne dosent return a promise thats way when it fails there
    // is no error passed, 
    // why though 'await' dosent say that this function is not a promise?
    // I think what happens is that mongoose methods obviously are returnig promise
    // but the promise reject is not lack of the search value for expamle no 
    // user with provided email- no this is part of the succes function, 
    // the reject says about connection to database!
    if(!user){
      const error = new HttpError('Nie ma użytkownika posiadającego podany email adres', 403);
      return next(error)
    }
  
     
    let token;
    try {
 token =await crypto.randomBytes(32).toString('hex')
    }catch{
      const error = new HttpError(
        'Creating crypto failed',
        500
      );
      return next(error);
    }
   
    user.resetToken = token;
    // 3600000 miliseconds will give us an hour
    user.resetTokenExpiration = Date.now() + 3600000;
    try {
      await user.save();
    } catch (err) {
      const error = new HttpError(
        'Something went wrong, could not update the user with token.',
        500
      );
      return next(error);
    }
    const transporter = nodemailer.createTransport(
      sendgridTransport({
        auth: {
          // you can use here usrename as well
          api_key:
          process.env.SENDGRID_API_KEY
        }
      })
    );
    try{
      await transporter.sendMail({
        to: req.body.email,
          from: 'spatulatom@gmail.com',
          subject: 'Reset hasła',
          html: `
            <p>Poprosiłeś/aś o zmianę hasła na 'Co słychać'. Link poniżej jest ważny przez 60 minut.</p>
            <p>Kliknij <a href="https://familija-fc0e5.web.app/new-password/${token}">link</a> żeby utworzyć nowe hasło.</p>
          `
      });
    }catch(err){
      const error = new HttpError('Created sendMail form but failed to send', 401)
      return next(error)
    
    }
res.json({message: 'Sprawdź emaila po dodatkowe instrukcje (prawdopodobnie w folderze ze spamem). Wiadmość jest zatytułowana: Reset hasła'})
}

const newpassword = async(req,res,next)=>{ 
  // so into findOne we inputting two criteria for our user that we want to find
  // first one is matching token, second is the expiration date greater than ($gt) our
  // current date, only then we want to find our user
  let user;
 try{ user = await User.findOne({ 
    resetToken: req.body.token,
    // resetTokenExpiration: { $gt: Date.now() } - this check dosent seem to work
  })
  // // you need this extra if otherwise even not existing token makes this
    // try block succesull, its the same in signup and reset you need that extra check
  if(!user){
    const error = new HttpError(
      'No user with that token.',
      500
    );
    return next(error);
  }
  }
  catch (err) {
    const error = new HttpError(
      'Could not create your password, try again please.',
      500
    );
    return next(error);
  }


  if(user.resetTokenExpiration< Date.now()){
    const error = new HttpError('Link do resetowania hasła wygasł (był ważny 60 minut). Wróć do strony logowania i kliknij ponownir link: Nowe hasło.', 403);
    return next(error);
  }

  let hashedPassword;
try {
  hashedPassword = await bcrypt.hash(req.body.password, 12);
} catch (err) {
  const error = new HttpError(
    'Could not hash password, please try again.',
    403
  );
  return next(error);
}

user.password = hashedPassword;
user.resetToken = '';
user.resetTokenExpiration = '';
try{
  await user.save()
  
}catch(err){
  const error = new HttpError('Couldnt save new (hashed) password in the database', 401)
}
res.json({message: 'Twoje hasło zostało zmienione! Przejdź na stronę logowania.'})

}




exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
exports.reset = reset;
exports.newpassword = newpassword;