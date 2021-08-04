/***
 * 
 * Helper Class
 */

/**
 * Dependencies
 */
const crypto = require('crypto');
const queryString = require('querystring');

 /**
  * Helper Container
  */
let helpers = {};


/**
 * Create a SHA254 hash
 */

helpers.hash = (str) => {
    if (typeof (str) === 'string' && str.length > 0) {
        let hash = crypto.createHmac('sha256', config.hashKey).update(str).digest('hex');
        return hash;

    } else {
        return false;
    }
};

// In order not to  throw  an exception, when we try to parse and invalid input to json object
helpers.parseJsonToObject = (str) => {
    try {
        let jsonObject = JSON.parse(str);
        return jsonObject;
    } catch (err) {
        return {};
    }
};


// Generating random string as token ID
helpers.createRandomString = (len) => {
    let strLength = (typeof len) == 'number' && len > 0 ? len : false;
    if (strLength) {
        let possibleCharacters = 'abcdefghijklmnopqrstuvwxyz1234567890';
        let strResult = '';

        for (let i = 0; i < possibleCharacters.length; i++) {
            strResult += possibleCharacters.charAt(Math.floor(Math.random) * possibleCharacters.length);
        }
        return strResult;
    } else {
        return;
    }

}


//  Library to send sms
helpers.sendTwilioSms = (phone, message, callback) => {
    // Run validations on input values
    phone = (typeof phone) === 'string' && phone.trim().length === 11 ? phone.trim() : false;
    message = (typeof message) === 'string' && message.trim().length > 0 ? message.trim() : false;

    if (phone && message) {
        // Configure the request payload
        let payload = {
            'From': '',
            'To': '',
            'Body': '',
        }

        // Stringify the payload
        let stringPayload = queryString.stringify(payload);

        // Configure  request details
        let requestDetails = {
            'protocol': 'https',
            'hostname': 'app.twilio.com',
            'method': 'post',
            'path': '/2010-04-01/Accounts/'+config.twilio.accountSid+'/Messages.json',
            'auth': config.twilio.accountSid +':' + config.twilio.authToken,
            'headers': {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(stringPayload),
            }
        }

        // Instantiate the request object
        let req = https.request(requestDetails, (res) => {
            let status = res.statusCode;
            if (status === 200 || status === 201) {
                callback(false);
            }
            else {
                callback('Status code returned was (' + status + ')');
            }
        });

        // Bind the request to the  error event: this ensures an error is not thrown when this event is hit. 
        req.on('error', (err) => {
            callback(err);
        })

        // Add the  payload
        req.write(stringPayload);

        // Send the  request
        req.end();
    }
    else {
        callback('Parameters provided for outbound msg using Twilio are invalid');
    }
};



module.exports = helpers;