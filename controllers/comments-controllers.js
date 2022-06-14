const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

const HttpError = require('../models/http-error');
const User = require('../models/user');
const Place = require('../models/place')

const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');



const createComment = async(req, res, next)=>{


  const errors = validationResult(req);
    
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    );
  }

    let user;
                   try {
                     user = await User.findById(req.userData.userId);
                   } catch (err) {
                     const error = new HttpError(
                       'Creatingg place failed, please try again in a minute.',
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
          'CreatingGG comment failed, please try again.',
          500
        );
        return next(error);
      }
    
      if (!place) {
          const error = new HttpError('Could not find place for provided id.', 404);
          return next(error);
          }


          let date;
          let localDate;
          // date = new Date();
          date = new Date(new Date().setHours(new Date().getHours() + 2));

         // Specify date and time format using "style" options (i.e. full, long, medium, short)
          localDate = new Intl.DateTimeFormat('pl-PL',{ dateStyle: 'medium', timeStyle: 'short' }).format(date);


                   let comment = {
                       description: req.body.description,
                       addedBy: user.name,
                       date: localDate
                    }

                    place.comments.push(comment);



                  try {
                    await place.save();
                  } catch (err) {
                    const error = new HttpError(
                      'Adding comment failed.',
                      500
                    );
                    return next(error);
                  }
                // try {
                //     const sess = await mongoose.startSession();
                //     sess.startTransaction();
                //     await comment.save({ session: sess });
                //     place.comments.push(comment);
                //     await place.save({ session: sess });
                //     await sess.commitTransaction();
                //   } catch (err) {
                //     const error = new HttpError(
                //       'Creating comment failed, please try again.',
                //       500
                //     );
                //     return next(error);
                //   }
                  res
                  .status(201)
                  .json(comment);

                 


}

exports.createComment = createComment;