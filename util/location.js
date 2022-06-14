const axios = require('axios');


const HttpError = require('../models/http-error');

// we will turn this function into asyn function using async keyword 
// in front of it, it will make sure that the return value of this function 
// gets wrapped into a promise and makes sure that when you are working with promises
// in there you can use await in front of the promise  to wait for 
// its response instead of promises.then
async function getCoordsForAddress(address) {
  // return {
  //   lat: 40.7484474,
  //   lng: -73.9871516
  // };

  // npm install --save axios, axios can olny be used on node server to 
  // send request from here
  // google gecoding api for this address:
  // https://developers.google.com/maps/documentation/geocoding/start
  // encodeURIComponent is a global function which will encode its argumnent
  // into url friendly format
  try{
  const response = await axios.get(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address
    )}&key=${process.env.GOOGLE_API_KEY}`
  );
  const data = response.data;

  // google will give us data.status==='Zero-results' if no coordinates where found
  // for the given address, so basically this covers the scenario that user
  // typed in valid adress that simply wasnt found
  if (!data || data.status === 'ZERO_RESULTS') {
    const error = new HttpError(
      'Could not find location for the specified address.',
      422
    );
    // if we throw an error here the promise that everything is wrapped in 
    // will also
    console.log('Error1 location.js',error)
    // throw error;
    return {
        lat: 52.2318,
        lng: 21.0060
      };
  }

  const coordinates = data.results[0].geometry.location;

  return coordinates;
} catch(err){
  console.log('ERROR2',err)
  const error = new HttpError(
    'Could not find location for the specified address2',
    422
  );

  // throw error;
  console.log('Error3 location.js',error);
  return {
    lat: 52.2318,
    lng: 21.0060
  };
  
  }
  


}

module.exports = getCoordsForAddress;
