const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

const HttpError = require('../models/http-error');
const getCoordsForAddress = require('../util/location');
const Place = require('../models/place');
const User = require('../models/user');

const AWS = require('aws-sdk');
// const { response } = require('express');
const fs = require ('fs');
const uuid = require('uuid/v1');
// const awsUpload = require('../middleware/aws-upload');

const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');


const addLike = async(req,res,next) => {
  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (err) {
    const error = new HttpError(
      'No connection to Mongodb 1, addLike',
      500
    );
    return next(error);
  }

  if (!user) {
    const error = new HttpError('Could not find user for provided id.', 404);
    return next(error);
  }

  let place;
  try {
      place = await Place.findById(req.body.placeId);
    } catch (err) {
      const error = new HttpError(
        'No connection no MongoBd 2, addLike, please try again.',
        500
      );
      return next(error);
    }
  
    if (!place) {
        const error = new HttpError('Could not find place for provided id.', 404);
        return next(error);
        }

        let like = {name: user.name,
                    userId: user.id}
        place.likes.push(like);

        try {
          await place.save();
        } catch (err) {
          const error = new HttpError(
            'Adding like failed.',
            500
          ); 

          return next(error);

        }
        const likes = place.toObject({ getters: true }).likes;
        // res.status(200).json({ likes: place.toObject({ getters: true }) });
        res.status(200).json(likes);
        console.log("success addedlike")
}

const deleteLike = async(req,res,next) => {
let user;
try {
  user = await User.findById(req.userData.userId);
} catch (err) {
  const error = new HttpError(
    'No connection to Mongodb 1, addLike',
    500
  );
  return next(error);
}

if (!user) {
  const error = new HttpError('Could not find user for provided id.', 404);
  return next(error);
}

let place;
try {
    place = await Place.findById(req.body.placeId);
  } catch (err) {
    const error = new HttpError(
      'No connection no MongoBd 2, addLike, please try again.',
      500
    );
    return next(error);
  }

  if (!place) {
      const error = new HttpError('Could not find place for provided id.', 404);
      return next(error);
      }

      let like = {name: user.name,
                  userId: user.id}
      place.likes.pull(like);

      try {
        await place.save();
      } catch (err) {
        const error = new HttpError(
          'Deleting like failed.',
          500
        ); 

        return next(error);

      }
// for some reson if: res.status(200).json({ likes: place.toObject({ getters: true }) }); is
// returned we get likes before deletion, even though the are accutally deleted in database;
// so for now i will get the place again and call it place two ande return:
// (this might have to do sth with the pull method compared to push method)
  let place2;
try {
  place2 = await Place.findById(req.body.placeId);
} catch (err) {
  const error = new HttpError(
    'No connection no MongoBd 2, addLike, please try again.',
    500
  );
  return next(error);
}

if (!place2) {
    const error = new HttpError('Could not find place for provided id.', 404);
    return next(error);
    }


    const likes = place2.toObject({ getters: true }).likes;
    res.status(200).json(likes)
      // res.status(200).json({ likes: place2.toObject({ getters: true }) });
      console.log("success delete")
}

const getAllUsersPlaces = async(req,res,next)=>{
  let places;
  try {
    places = await Place.find();
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not find a places.',
      500
    );
    return next(error);
  }

  if (!places) {
    const error = new HttpError(
      'Could not find All Users places.',
      404
    );
    return next(error);
  }

  res.json({ foundplaces:places.map(place=>place.toObject({getters:true})) });
};

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not find a place.',
      500
    );
    return next(error);
  }

  if (!place) {
    const error = new HttpError(
      'Could not find place for the provided id.',
      404
    );
    return next(error);
  }

  res.json({ place: place.toObject({ getters: true }) });
};

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  // let places;
  let userWithPlaces;
  try {
    userWithPlaces = await User.findById(userId).populate('places');
  } catch (err) {
    const error = new HttpError(
      'Fetching places failed, please try again later.',
      500
    );
    return next(error);
  }

  // if (!places || places.length === 0) {
  if (!userWithPlaces || userWithPlaces.places.length === 0) {
    return next(
      new HttpError('Could not find places for the provided user id.', 404)
    );
  }

  

  res.json({
    places: userWithPlaces.places.map(place =>
      place.toObject({ getters: true })
    )
  });
};


const createPost = async(req,res,next) => {

  const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(
        new HttpError('Invalid inputs passed, please check your data.', 422)
      );
    }
  
    const {description, address} = req.body;
  
    let coordinates;
    
    try {
      coordinates = await getCoordsForAddress(address);
    } catch (error) {
      return next(error);
    }
  
    
  let user;
    try {
      user = await User.findById(req.userData.userId);
    } catch (err) {
      const error = new HttpError(
        'Creating post failed, please try again.',
        500
      );
      return next(error);
    }
  
    if (!user) {
      const error = new HttpError('Could not find user for provided id.', 404);
      return next(error);
    }

                    let date;
                    let localDate;
                    // date = new Date();
                    date = new Date(new Date().setHours(new Date().getHours() + 2));
                    // localDate = new Intl.DateTimeFormat('pl-PL',{ dateStyle: 'full', timeStyle: 'short' }).format(date)
                    localDate = new Intl.DateTimeFormat('pl-PL',{ dateStyle: 'medium', timeStyle: 'short' }).format(date)
  
    const createdPlace = new Place({
      title: 'decoy title',
      description,
      address,
      location: coordinates,
      image: 'decoy-image',
      creator: req.userData.userId,
      date: localDate,
      creatorName: user.name,
      creatorImage: user.image,
      comments: [],
      likes: []
    });
  
    console.log('createdPost', createdPlace);
  
    try {
      const sess = await mongoose.startSession();
      sess.startTransaction();
      await createdPlace.save({ session: sess });
      user.places.push(createdPlace);
      await user.save({ session: sess });
      await sess.commitTransaction();
    } catch (err) {
      const error = new HttpError(
        'Creating place failed, please try again.',
        500
      );
      return next(error);
    }
    // adding creators image

    res.status(201).json({ place: createdPlace });

    

}


const createPlace =  (req, res, next) => {
//  logic for aws:
    const s3 = new AWS.S3({
      secretAccessKey: process.env.AWS_SECRET_KEY,
      accessKeyId: process.env.AWS_KEY_ID
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
            s3.upload(params, async (err, result) => {
                if(err) {
                   console.log("Error3", err);
                } else {
                    
                   console.log("S3 Response",result.Location);
                     result.Location;
                   console.log('bla');
                   
//  here we have original coding for createPlace
                   const errors = validationResult(req);
                   if (!errors.isEmpty()) {
                     return next(
                       new HttpError('Invalid inputs passed, please check your data.', 422)
                     );
                   }
                 
                   const { title, description, address } = req.body;
                 
                   let coordinates;
                   try {
                    console.log('bla');
                     coordinates = await getCoordsForAddress(address);
                     console.log('bla2');
                   } catch (error) {
                    console.log('bla3');
                     return next(error);
                   }
                 let user;
                   try {
                     user = await User.findById(req.userData.userId);
                   } catch (err) {
                     const error = new HttpError(
                       'Creatingg place failed, please try again.',
                       500
                     );
                     return next(error);
                   }
                 
                   if (!user) {
                     const error = new HttpError('Could not find user for provided id.', 404);
                     return next(error);
                   }

                    let date;
                    let localDate;
                    
                    // date = new Date().addHours(2);
                    // https://stackoverflow.com/questions/1050720/how-to-add-hours-to-a-date-object
                    date = new Date(new Date().setHours(new Date().getHours() + 2));
                    // localDate = new Intl.DateTimeFormat('pl-PL',{ dateStyle: 'medium', timeStyle: 'short' }).format(date)
                    localDate = new Intl.DateTimeFormat('pl-PL',{ dateStyle: 'medium', timeStyle: 'short' }).format(date)
                    
                    const createdPlace = new Place({
                     title,
                     description,
                     address,
                     location: coordinates,
                     image: result.Location,
                     creator: req.userData.userId,
                     date: localDate,
                     creatorName: user.name,
                     comments: [],
                     creatorImage: user.image,
                     likes: []
                   });
                 
                 
                   try {
                     const sess = await mongoose.startSession();
                     sess.startTransaction();
                     await createdPlace.save({ session: sess });
                     user.places.push(createdPlace);
                     await user.save({ session: sess });
                     await sess.commitTransaction();
                   } catch (err) {
                     const error = new HttpError(
                       'Creating place failed, please try again.',
                       500
                     );
                     return next(error);
                   }
                 
                   res.status(201).json({ place: createdPlace });
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
                      to: 'elkom93@gmail.com',
                      from: 'spatulatom@gmail.com',
                      subject: 'Nowe zdjęcie na aplikacji rodzinnej',
                      html: '<h1>Nowe zdjęcie na aplikacji rodzinnej.  <a href= "https://familija-fc0e5.web.app/"> Klinkj tutaj żeby je zobaczyć.</a></h1>'
                    });
                  }catch(err){
                    console.log('ERROR',err);
                    return next()
                  
                  }
                
                  try{
                    await transporter.sendMail({
                      to: 'aga4094@yahoo.com',
                      from: 'spatulatom@gmail.com',
                      subject: 'Nowe zdjęcie na aplikacji rodzinnej',
                      html: '<h1>Nowe zdjęcie na aplikacji rodzinnej.  <a href= "https://familija-fc0e5.web.app/"> Klinkj tutaj żeby je zobaczyć.</a></h1>'
                    });
                  }catch(err){
                    console.log('ERROR',err);        
                    return next()
                  
                  }
                  try{
                    await transporter.sendMail({
                      to: 'sypula.maria@gmail.com',
                      from: 'spatulatom@gmail.com',
                      subject: 'Nowe zdjęcie na aplikacji rodzinnej',
                      html: '<h1>Nowe zdjęcie na aplikacji rodzinnej.  <a href= "https://familija-fc0e5.web.app/"> Klinkj tutaj żeby je zobaczyć.</a></h1>'
                    });
                  }catch(err){
                    console.log('ERROR',err);
                    return next()
                  
                  }
                  try{
                    await transporter.sendMail({
                      to: 'filipsypula45@gmail.com',
                      from: 'spatulatom@gmail.com',
                      subject: 'Nowe zdjęcie na aplikacji rodzinnej',
                      html: '<h1>Nowe zdjęcie na aplikacji rodzinnej.  <a href= "https://familija-fc0e5.web.app/"> Klinkj tutaj żeby je zobaczyć.</a></h1>'
                    });
                  }catch(err){
                    console.log('ERROR',err);
                    return next()
                  
                  }
                  try{
                    await transporter.sendMail({
                      to: 'alinagawlas@op.pl',
                      from: 'spatulatom@gmail.com',
                      subject: 'Nowe zdjęcie na aplikacji rodzinnej',
                      html: '<h1>Nowe zdjęcie na aplikacji rodzinnej.  <a href= "https://familija-fc0e5.web.app/"> Klinkj tutaj żeby je zobaczyć.</a></h1>'
                    });
                  }catch(err){
                    console.log('ERROR',err);
                    return next()
                  
                  }
                  try{
                    await transporter.sendMail({
                      to: 'mikolajsypula2115@gmail.com',
                      from: 'spatulatom@gmail.com',
                      subject: 'Nowe zdjęcie na aplikacji rodzinnej',
                      html: '<h1>Nowe zdjęcie na aplikacji rodzinnej.  <a href= "https://familija-fc0e5.web.app/"> Klinkj tutaj żeby je zobaczyć.</a></h1>'
                    });
                  }catch(err){
                    console.log('ERROR',err);
                    return next()
                  
                  }
                  try{
                    await transporter.sendMail({
                      to: 'psypula@rocketmail.com',
                      from: 'spatulatom@gmail.com',
                      subject: 'Nowe zdjęcie na aplikacji rodzinnej',
                      html: '<h1>Nowe zdjęcie na aplikacji rodzinnej.  <a href= "https://familija-fc0e5.web.app/"> Klinkj tutaj żeby je zobaczyć.</a></h1>'
                    });
                  }catch(err){
                    console.log('ERROR',err);
                    return next()
                  
                  }
                  try{
                    await transporter.sendMail({
                      to: 'magda_sypula@yahoo.pl',
                      from: 'spatulatom@gmail.com',
                      subject: 'Nowe zdjęcie na aplikacji rodzinnej',
                      html: '<h1>Nowe zdjęcie na aplikacji rodzinnej.  <a href= "https://familija-fc0e5.web.app/"> Klinkj tutaj żeby je zobaczyć.</a></h1>'
                    });
                  }catch(err){
                    console.log('ERROR',err);
                    return next()
                  
                  }
                  



                }
            })
            
        }
    });

// original
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return next(
//         new HttpError('Invalid inputs passed, please check your data.', 422)
//       );
//     }
  
//     const { title, description, address } = req.body;
  
//     let coordinates;
//     try {
//       coordinates = await getCoordsForAddress(address);
//     } catch (error) {
//       return next(error);
//     }
    
    
//   let user;
//     try {
//       user = await User.findById(req.userData.userId);
//     } catch (err) {
//       const error = new HttpError(
//         'Creatingg place failed, please try again.',
//         500
//       );
//       return next(error);
//     }
  
//     if (!user) {
//       const error = new HttpError('Could not find user for provided id.', 404);
//       return next(error);
//     }
  
//     const createdPlace = new Place({
//       title,
//       description,
//       address,
//       location: coordinates,
//       image: req.file.path,
//       creator: req.userData.userId,
//       date: new Date(),
//       creatorName: user.name,
//     });
  
//     console.log(user);
  
//     try {
//       const sess = await mongoose.startSession();
//       sess.startTransaction();
//       await createdPlace.save({ session: sess });
//       user.places.push(createdPlace);
//       await user.save({ session: sess });
//       await sess.commitTransaction();
//     } catch (err) {
//       const error = new HttpError(
//         'Creating place failed, please try again.',
//         500
//       );
//       return next(error);
//     }
  
//     res.status(201).json({ place: createdPlace });


};

// const createPlace = async (req, res, next) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     return next(
//       new HttpError('Invalid inputs passed, please check your data.', 422)
//     );
//   }

//   const { title, description, address } = req.body;

//   let coordinates;
//   try {
//     coordinates = await getCoordsForAddress(address);
//   } catch (error) {
//     return next(error);
//   }
//    let uplaod = awsUpload(req.file.path, req.file.mimetype);
  
// let user;
//   try {
//     user = await User.findById(req.userData.userId);
//   } catch (err) {
//     const error = new HttpError(
//       'Creatingg place failed, please try again.',
//       500
//     );
//     return next(error);
//   }

//   if (!user) {
//     const error = new HttpError('Could not find user for provided id.', 404);
//     return next(error);
//   }

//   const createdPlace = new Place({
//     title,
//     description,
//     address,
//     location: coordinates,
//     image: req.file.path,
//     creator: req.userData.userId,
//     date: new Date(),
//     creatorName: user.name,
//   });

//   console.log(user);

//   try {
//     const sess = await mongoose.startSession();
//     sess.startTransaction();
//     await createdPlace.save({ session: sess });
//     user.places.push(createdPlace);
//     await user.save({ session: sess });
//     await sess.commitTransaction();
//   } catch (err) {
//     const error = new HttpError(
//       'Creating place failed, please try again.',
//       500
//     );
//     return next(error);
//   }

//   res.status(201).json({ place: createdPlace });
// };

const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    );
  }

  const {description, address } = req.body;
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not update place.',
      500
    );
    return next(error);
  }

  if (place.creator.toString() !== req.userData.userId) {
    const error = new HttpError('You are not allowed to edit this place.', 401);
    return next(error);
  }

  
  place.description = description;
   
  let coordinates;
  try {
   console.log('bla');
    coordinates = await getCoordsForAddress(address);
    console.log('bla2');
  } catch (error) {
   console.log('bla3');
    return next(error);
  }
  place.location = coordinates;
  place.address=address;


  try {
    await place.save();
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not update place.',
      500
    );
    return next(error);
  }

  res.status(200).json({ place: place.toObject({ getters: true }) });
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId).populate('creator');
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not delete place.',
      500
    );
    return next(error);
  }

  if (!place) {
    const error = new HttpError('Could not find place for this id.', 404);
    return next(error);
  }

  if (place.creator.id !== req.userData.userId) {
    const error = new HttpError(
      'You are not allowed to delete this place.',
      401
    );
    return next(error);
  }

  const imagePath = place.image;

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.remove({ session: sess });
    place.creator.places.pull(place);
    await place.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not delete place.',
      500
    );
    return next(error);
  }

  fs.unlink(imagePath, err => {
    console.log(err);
  });

  res.status(200).json({ message: 'Deleted place.' });
};
exports.getAllUsersPlaces =getAllUsersPlaces;
exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
exports.createPost = createPost;
exports.addLike = addLike;
exports.deleteLike = deleteLike;
