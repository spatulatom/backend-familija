const express = require('express');
const { check } = require('express-validator');

const placesControllers = require('../controllers/places-controllers');
const fileUpload = require('../middleware/file-upload');
const checkAuth = require('../middleware/check-auth');

const router = express.Router();

// these three roues below are not token protected yet 
// there are still made unavailble(not seen) through frontend
// - they availble for example throug postman without any token :
// its jus to much hassle to write frontend requests

router.get('/', placesControllers.getAllUsersPlaces);

router.get('/:pid', placesControllers.getPlaceById);

router.get('/user/:uid', placesControllers.getPlacesByUserId);

router.use(checkAuth);

router.post(
  '/',
  fileUpload.single('image'),
  [
    check('title')
      .not()
      .isEmpty(),
    check('description').isLength({ min: 2 }),
    check('address')
      .not()
      .isEmpty()
  ],
  placesControllers.createPlace
);

router.post(
  '/posts',
  
  [
    check('description').isLength({ min: 2 }),
  ],
  placesControllers.createPost
);

router.post(
  '/likes-add',placesControllers.addLike);

  router.delete(
    '/likes-delete',placesControllers.deleteLike);


router.patch(
  '/:pid',
  [
  
    check('description').isLength({ min: 2 })
  ],
  placesControllers.updatePlace
);

router.delete('/:pid', placesControllers.deletePlace);

module.exports = router;
