/**
 * Dependencies
 */
const fs = require('fs');
const path = require('path');
const url = require('url');
const https = require('https');
const http = require('http');
const helpers = require('./helpers');
const _data = require('./data');


let workers = {};

// Initial fn to gather checks
workers.gatherAllChecks = () => {
    _data.list('checks', (err, checks) => {
        if (!err && checks && checks.length > 0) {
            checks.array.forEach((check) => {
                _data.read('checks', check, (err,  checkData) => {
                    if (!err && checkData) {
                        workers.validateCheckData(checkData);
                    } else {
                        console.log('Error reading one of the checks');
                    }
                })
            });
        } else {
            console.log('Error listing checks as it may be empty')
        }
    })
}

// Sanity Check  the check data
workers.validateCheckData = (checkData) => {
    checkData = (typeof checkData) === 'object' && checkData.length > 0 ? checkData : {};
    checkData.id = (typeof checkData.id) === 'string' && checkData.id.trim().length === 20 ? checkData.id.trim() : false;

    checkData.userPhone = (typeof checkData.userPhone) === 'string' && checkData.length > 0 ? checkData.userPhone : false;

    checkData.protocol = (typeof checkData.protocol) === 'object' && ['http', 'https'].indexOf(checkData.protocol) > -1 && checkData.protocol.length > 0 ? checkData.protocol : [];

    checkData.method = (typeof checkData.method) === 'object' && ['post', 'get', 'put', 'delete'].indexOf(checkData.method) > -1 && checkData.length > 0 ? checkData.method : [];

    checkData.url = (typeof checkData.url) === 'string' && checkData.url.trim().length > 0 ? chechData.url.trim() : false;

    checkData.successCodes = (typeof checkData.successCodes) === 'string' && checkData.successCodes instanceof Array && checkData.successCodes.length > 0 ? checkData.successCodes : false;

    checkData.timeoutSeconds = (typeof data.payload.timeoutSeconds) === 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;


    checkData.state = (typeof checkData.state) === 'string' && ['up', 'down'].indexOf(checkData.state) > -1 ? checkData.state : 'down'
    
    checkData.lastChecked = (typeof checkData.lastChecked) === 'number' && checkData.lastChecked > 0 ? chechData.lastChecked : false;

    if (checkData.id &&
        checkData.userPhone &&
        checkData.protocol && 
        checkData.method &&
        checkData.url &&
        checkData.successCodes &&
        checkData.timeoutSeconds
    ) {
        workers.performCheck(checkData);
    } else {
        console.log('Error while attempting to  perform a check');
        }


}
 
// Loop  to  continue  the  process
workers.loop = () => {
    setInterval(() => {
        workers.gatherAllChecks();
    }, 1000  * 60)
}

workers.init = () => {
    workers.gatherAllChecks();
    workers.loop();
}

workers.performCheck = (checkData) => {

    // Initialise check outcome
    let checkOutcome = {
        'error': false,
        'responseCode': false,
    }

    // Initialise  outcome sent status 
    const outcomeSent = false;
     
    // Parse hostname  and url out  of  the original checkData
    let parsedUrl = url.parse(checkData.protocol + '://' + checkData.url, true);
    let hostname = parsedUrl.hostname;
    let path = parsedUrl.path; // path instead of pathname to enable pulling query string from the url.


    // Construct request object 
    let requestObject = {
        'protocol': checkData.protocol,
        'hostname': checkData.hostname,
        'method': checkData.method.toUpperCase(),
        'path': parsedUrl,
        'timeoutSeconds': checkData.timeoutSeconds * 1000,
    }

    // Confirm passed protocol to use
    let _moduleToUse = checkData.protocol === 'http' ? http : https;

    _moduleToUse.request(checkData, (res) => {
        const status = res.statusCode;

        //Update the checkOutcome and pass data along
        checkOutcome.responseCode = status;
        if (!outcomeSent) {
            workers.processCheckOutcome(checkData, checkOutcome);
            outcomeSent = true;
        }

    })

    //  Bind to the error event so an exception is  not thrown
    req.on('error', (err) => {
        checkOutcome.error = {
            'error': true,
            'message': err,
        }
        if (!outcomeSent) {
            workers.processCheckOutcome(checkData, checkOutcome);
            outcomeSent = true;
        }

    })

    //  Bind to the timeout event so an exception is  not thrown
    req.on('timeout', (err) => {
        checkOutcome.error = {
            'error': true,
            'message': 'timeout',
        }
        if (!outcomeSent) {
            workers.processCheckOutcome(checkData, checkOutcome);
            outcomeSent = true;
        }

    })

    req.end();


    // Process check outcome and update check data, trigger alert to user if needed.
    workers.processCheckOutcome = (checkData, checkOutcome) => {
        let state = !checkOutcome.error && checkOutcome.responseCode && checkData.successCodes.indexOf(checkOutcome.responseCode) > -1
        ? 'up' : false;

        // Decide if alert is  warranted
        // If there is a lastChecked  and state has changed since the last  time,  do not send out an alert
        let alertWarranted = checkData.lastChecked && checkData.state !== state ? true : false;

        // If yes and alert is warranted, update the checkData object
        let updatedCheckData = checkData;

        updatedCheckData.state = state;
        updatedCheckData.lastChecked = Date.now();


        // Save  the update to  our check files
        _data.update('checks', checkData.id, updatedCheckData, (err) => {
            // Check logic for performing action of on alert to users
            if (!err && alertWarranted) {
                workers.alertUsers(updatedCheckData);
            } else {
                console.log('Error trying to update checks file');
            }
        })

        // Func to alert users when alert is warranted
        workers.alertUsers = (updatedCheckData) => {
            let msg = 'Check on ' + updatedCheckData.method.toUpperCase() + updatedCheckData.protocol + '://' + updatedCheckData.url + ' is ' + updatedCheckData.state;

            helpers.sendTwilioSms(updatedCheckData.userPhone, msg, (err) => {
                if (!err) {
                    console.log('Success!!! \n Alert has been sent to the  user');
                } else {
                    console.log('Could not send alert to user for this check status');
                }
            }) 
        }

    }


     
}



module.exports = workers;