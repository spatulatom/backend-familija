const AWS = require('aws-sdk');
const fs = require ('fs');
const uuid = require('uuid/v1');

const awsUpload = async (path,type)=> {

let response;
// AWS SDK Configuration
const s3 = new AWS.S3({
    secretAccessKey: 'aJbWVgfgR32O87TpRanvZS5OZzpaDrqnqG77UoAm',
    accessKeyId: 'AKIA2T4QYOLUNYDXNN67',
})
    let readfile; 
    let another;
if(!s3){console.log('error1')};

if(!s3){ console.log('s3')}

// fs.writeFile(path, 'hello');
// fs.readFile is asyn method and basically awsUplad was returning and readFile 
// didnt eeven finish, so in return we were getting undefined value
try{


    readfile= fs.readFile(path, (err, fileBody) => {
    console.log('here') ;
    if(err) {
       console.log("Error2", err);
    }  else {
        let params = {
            ACL: "public-read-write",
            Bucket: 'placesbook',
            Body: fileBody,
            ContentType: type,
            Key: uuid()+'.'+type
        };
       console.log('here') ;
        s3.upload(params, (err, result) => {
            if(err) {
               console.log("Error3", err);
            } else {
                
               console.log("S3 Response",result.Location);
                 result.Location
               console.log('bla');
            }
        })
        
    }
});

} catch(err){}
console.log('readfile',readfile);
return readfile;
}


    module.exports = awsUpload;