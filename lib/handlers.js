
//  Dependencies
const _data = require('./data');
const helpers = require('./helpers');
const config = require('../config');


//  Setup up handlers
const handler = {};

//  Check requests  made to users  route, determine request method and handle accordingly
handler.users = (data, callback) => {
    // Initialize the allowed methods
    const allowedMethods = ['post', 'get', 'put', 'delete'];
    if (allowedMethods.indexOf(data.method) > -1) {
        handler._users[data.method](data, callback);
    } else {
        callback(405);
    }
}

// Separate request types to users
handler._users = {};

handler._users.post = (data, callback) => {
    let firstname = typeof (data.payload.firstname) === 'string' && data.payload.firstname.trim().length > 0 ?
        data.payload.firstname.trim() : false;
    let lastname = typeof (data.payload.lastname) === 'string' && data.payload.lastname.trim().length > 0 ?
        data.payload.lastname.trim() : false;
    let phone = typeof (data.payload.phone) === 'number' && data.payload.phone.trim().length === 11 ?
        data.payload.phone.trim() : false;
    let password = typeof (data.payload.password) === 'string' && data.payload.trim().length > 0 ?
        data.payload.password.trim() : false;
    let tosAgreement = typeof (data.payload.tosAgreement) === 'boolean' && data.payload.tosAgreement === true ? true : false;

    if (firstname && lastname && phone && password && tosAgreement) {
        // Check if user already exists
        _data.read('users', phone, (err, data) => {
            if (!err) {
                // Hash the password
                let hashedPassword = helpers.hash(password);

                if (hashedPassword) {
                    // Create the user object
                    let userObject = {
                        'firstName': firstname,
                        'lastName': lastname,
                        'phone': phone,
                        'hashedPassword': hashedPassword,
                        'tosAgreement': tosAgreement,
                    };

                    // Save the user
                    _data.create('users', phone, userObject, (err) => {
                        if (!err) {
                            callback(200);

                        } else {
                            console.log(err);
                            callback(500, {
                                Error: 'Could not create the user',
                            })
                        }
                    })
                } else {
                    callback(500, {
                        Error: 'Could not hash the user',
                    })
                }

            } else {
                callback(400, {
                    Error: 'User with this phone number already exists',
                })
            }
        })
    } else {
        callback(405, {
            Error: 'Some fields are missing',
        })
    }
}

//Getting user
// Allowing only authenticated users to access the user records.
handler._users.get = (data, callback) => {
    let phone = typeof (data.queryString.phone) === 'string' && data.queryString.phone.trim().length === 11 ? data.queryString.phone.trim() : false;

    if (!phone) {
        callback(400, {
            Error: 'Missing some fields',
        })
    } else {
        let id = typeof (data.headers.token) === 'string' && data.headers.token.trim().length === 20 ? data.headers.token : false;
        // Call verify method to confirm validity of token passed in request headers
        handler._tokens.verify(id, phone, (isValid) => {
            if (isValid) {
                _data.read('users', phone, (err, data) => {
                    if (!err && data) {
                        // Remove hashedPassword from the user object
                        delete data.hashedPassword;
                        // Data returned is from the returned user object not passed data @ request point.
                        callback(200, data);
                    } else {
                        callback(404, {
                            Error: 'User not found',
                        });
                    }
                })
            } else {
                callback(403, {
                    Error: 'Missing required field(s)  or token is invalid',
                })
            }
        })
    }
}


handler._users.put = (data, callback) => {
    let phone = typeof (data.payload.phone) === 'string' && data.payload.phone.trim().length === 11 ? data.payload.phone.trim() : false;

    let firstname = typeof (data.payload.firstname) === 'string' && data.payload.firstname.trim().length > 0 ?
        data.payload.firstname.trim() : false;
    
    let lastname = typeof (data.payload.lastname) === 'string' && data.payload.lastname.trim().length > 0 ?
        data.payload.lastname.trim() : false;
    
    let password = typeof (data.payload.password) === 'string' && data.payload.trim().length > 0 ?
        data.payload.password.trim() : false;
    
    if (phone) {
        if (firstname || lastname || password) {
            // Check that user token  is also valid
            let id = typeof (data.headers.id) === 'string' && data.headers.id.trim().length === 20 ? data.headers.id.trim() : false;

            handler._tokens.verify(id, phone, (isValid) => {
                if (isValid) {
                    _data.read('users', phone, (err, userData) => {
                        if (!err && userData) {
                            if (firstname) {
                                userData.firstName = firstname;
                            }
                            if (lastname) {
                                userData.lastName = lastname;
                            }
                            if (password) {
                                userData.hashedPassword = hashedPassword;
                            }
                            _data.update('users', phone, (err, userData) => {
                                if (!err && userData) {
                                    callback(200)
                                } else {
                                    callback(500, {
                                        Error: 'Could not update the user',
                                    });
                                }
                            })
                        } else {
                            callback(400, {
                                Error: 'User does not exist',
                            })
                        }
                    })
                } else {
                    callback(403, {
                        Error: 'Missing required field(s) or  token id is not valid',
                    });
                }
            })
        } else {
            callback(400, {
                Error: 'Missing some required fields',
            })
        }
    } else {
        callback(400, {
            Error: 'Access is reserved for the authenticated user',
        })
    }
}

// Deleting user from file
handler._users.delete = (data, callback) => {
    let phone = typeof (data.queryString.phone) === 'string' && data.queryString.phone.trim().length === 11 ? data.queryString.phone.trim() : false;

    if (!phone) {
        callback(400, {
            Error: 'Missing some fields',
        })
    } else {
        _data.read('users', phone, (err, userData) => {
            if (!err && userData) {
                _data.delete('users', phone, (err) => {
                    if (!err) {
                        // if successfully deleted, all associated checks will be deleted
                        //  so lets read checks file
                        let userChecks = (typeof userData.checks) === 'object' && userData.checks instanceof Array && userData.checks.length > 0 ? userData.checks : [];
                        let checksToDelete = userChecks.length;

                        if (checksToDelete > 0) {
                            let deletedChecks = 0;
                            let deletionErrors = false;

                            userChecks.array.forEach(checkid => {
                                _data.delete('checks', checkid, (err) => {
                                    if (err) {
                                        deletionErrors = true;
                                    } 
                                    deletedChecks += 1;
                                    if (checksToDelete === deletedChecks) {
                                        callback(200);
                                    } else {
                                        callback(500, {
                                            Error: 'Error encountered while attempting to delete all checks for this user('+phone+')'
                                        })
                                    }
                               }) 
                            });
                            
                        } else {
                            callback(200);
                        }
                    } else {
                        console.log(err); 
                        callback(500, {
                            Error: 'Could not delete this user',
                        })
                    }
                })
            } else {
                callback(500, {
                    Error: 'Could not find user with this phone number or they may not exist',
                });
            }
        })
    }
}


handler.tokens = (data, callback) => {
    // Initialize the allowed methods
    const allowedMethods = ['post', 'get', 'put', 'delete'];
    if (allowedMethods.indexOf(data.method) > -1) {
        handler._tokens[data.method](data, callback);
    } else {
        callback(405);
    }
}

/**
 * Container to hold 
 * different request 
 * types that require tokens
 */
handler._tokens = {};

/**
 * Handling authenticated Post requests <Tokens>
 */
handler._tokens.post = (data, callback) => {
    let phone = (typeof data.payload.phone) === 'string' && data.payload.phone.trim().length === 11 ? data.payload.phone.trim() : false;
    let password = (typeof data.payload.password) === 'string' && data.payload.password.trim().length > 0 ? data.payload.password : false;

    if (phone && password) {
        // Confirm password match hashedPassword in file
        _data.read('users', phone, (err, userData) => {
            if (!err && userData) {
                let hashedPassword = helpers.hash(password);
                if (hashedPassword === userData.hashedPassword) {
                    // Generate a token for this user <random String>
                    let tokenId = helpers.createRandomString(20);
                    let expires = Date.now() + 1000 * 60 * 60; //Expires in 1hour
                    let tokenObject = {
                        token: tokenId,
                        phone: phone,
                        expires: expires,
                    };

                    // Store the token
                    _data.createToken('tokens', tokenId, tokenObject, (err) => {
                        if (!err) {
                            callback(200, tokenObject);
                        } else {
                            callback(500, {
                                Error: 'Could not create token for authenticated user',
                            })
                        }
                    })
                } else {
                    callback(400, {
                        Error: 'Password does not match user password on file',
                    })
                }
            } else {
                callback(400, {
                    Error: 'User not found'
                })
            }
        })
    } else {
        callback(400, {
            Error: 'Missing required fields',
        })
    }
}


/**
 * Handling authenticated Get requests 
 */
handler._tokens.get = (data, callback) => {
    let id = typeof (data.queryString.id) === 'string' && data.queryString.id.trim().length === 20 ? data.queryString.id.trim() : false;

    if (!id) {
        callback(400, {
            Error: 'Missing required field',
        })
    } else {
        _data.read('tokens', id, (err, tokenObject) => {
            if (!err && tokenObject) {
                callback(200, tokenObject);
            } else {
                callback(404, {
                    Error: 'User is not authenticated',
                });
            }
        })
    }
}

/**
 * Handling authenticated put requests <tokens>
 */
handler._tokens.put = (data, callback) => {
    let id = (typeof data.payload.id) === 'string' && data.payload.id.trim().length === 20 ? data.payload.id.trim() : false;
    let extend = (typeof data.payload.extend) === 'boolean' && data.payload.extend === true ? true : false;

    if (id && extend) {
        _data.read('tokens', id, (err, tokenObject) => {
            if (!err && tokenObject) {
                if (tokenObject.expires > Date.now()) {
                    tokenObject.expires = Date.now() + 1000 * 60 * 60;

                    // Update the token in file
                    _data.update('tokens', id, tokenObject, (err) => {
                        if (!err) {
                            callback(200, tokenObject);
                        } else {
                            callback(500, {
                                Error: 'Could not update the token id',
                            })
                        }
                    })
                } else {
                    callback(400, {
                        Error: 'This token is already expired',
                    })
                }
            } else {
                callback(400, {
                    Error: 'Invalid token',
                })
            }
        })
    } {
        callback(400, {
            Error: 'Missing required fields',
        })
    }
}


/**
 * Handling authenticated delete requests <tokens>
 */

handler._tokens.delete = (data, callback) => {
    let tokenId = (typeof data.payload.id) === 'string' && data.payload.id.trim().length === 20 ? data.payload.id.trim() : false;

    if (tokenId) {
        let phone = (typeof data.payload.phone) === 'string' && data.payload.phone.trim().length === 11 ? data.payload.phone : false;

        let id = (typeof data.headers.token) === 'string' && data.headers.token.trim().length === 20 ? data.headers.token.trim() : false;

        handler._tokens.verify(id, phone, (isValid) => {
            if (isValid) {
                // Check for token Id in file
                _data.read('tokens', id, (err, tokenObject) => {
                    if (!err && tokenObject) {
                        _data.delete('tokens', id, (err) => {
                            if (!err) {
                                callback(200);
                            } else {
                                callback(500, {
                                    Error: 'Could not delete user token',
                                })
                            }
                        })
                    } else {
                        callback(400, {
                            Error: 'Token  does not  match any user in file'
                        })
                    }
                })
            } else {
                callback(403, {
                    Error: 'Missing required headers  or  token is invalid',
                })
            }
        })
    } else {
        callback(400, {
            Error: 'Missing required field(s)',
        })
    }
}
 

/**
 * Define handler to verify user with phone number  and token
 */
handler._tokens.verify = (id, phone, callback) => {
    _data.read('tokens', id, (err, tokenData) => {
        if (!err && tokenData) {
            // Check that id matches the phone number
            if (tokenData.phone === phone && tokenData.expires > Date.now()) {
                callback(true);
            } else {
                callback(false);
            }
        } else {
            callback(false);
            }
        }
    )
}


handler.checks = (data, callback) => {
    // Initialize the allowed methods
    const allowedMethods = ['post', 'get', 'put', 'delete'];
    if (allowedMethods.indexOf(data.method) > -1) {
        handler._checks[data.method](data, callback);
    } else {
        callback(405);
    }
}

/**
 * Container to hold 
 * different request 
 * types for checks
 */

 /**
  * Required for checks::
  * protocol
  * url
  * successCodes
  * timeoutSeconds
  * request methods 
  */

handler._checks = {};

handler._checks.post = (data, callback) => {
    let protocol = (typeof data.payload.protocol) === 'string' && ['http', 'https'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
    
    let url = (typeof data.payload.url) === 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
 
    let method = (typeof data.payload.method) === 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;

    let successCodes = (typeof data.payload.successCodes) === 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.trim().length > 0 ? data.payload.successCode : false;

    let timeoutSeconds = (typeof data.payload.timeoutSeconds) === 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;


    if (protocol && url && method && successCodes && timeoutSeconds) {
        //Check for token in request headers
        let tokenid = (typeof data.headers.token) === 'string' && data.headers.token.trim().length === 20 ? data.headers.token : false;
    
        // Read token in file
        if (tokenid) {
            _data.read('token', tokenid, (err, tokenData) => {
                if (!err && tokenData) {
                    let userPhone = tokenData.phone;
                    // Lookup user with this valid token
                    _data.read('users', 
                        userPhone, (err, userData) => {
                        if (!err && userData) {
                            // Identify available checks
                            let userChecks = typeof (userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : [];
                            
                            // Check that max number of  checks has not been exceeded.
                            if (userChecks.length < config.maxChecks) {

                                // Create a random string for the  check id
                                let checkId = helpers.createRandomString(20);

                                // Create the check object and add their phone number
                                let checkObject = {
                                    'checkId': checkId,
                                    'userPhone': userPhone,
                                    'protocol': protocol,
                                    'url': url,
                                    'method': method,
                                    'successCodes': successCodes,
                                    'timeoutSeconds': timeoutSeconds,
                                }; 

                                // Save checkObject to checks file
                                _data.create('checks', checkId, checkObject, (err) => {
                                    if (!err) {
                                        //  Update value for key checks in user Object
                                        userData.checks = userChecks;
                                        userData.checks.push(checkId);

                                        // Update the user data
                                        _data.update('users', userPhone, userData, (err) => {
                                            if (!err) {
                                                // Return the checkObject to the user so they can have generated check id. 
                                                callback(200, checkObject);   
                                            } else {
                                                callback(500, {
                                                    Error: 'Could  not update the user data',
                                                })
                                            }
                                        })

                                    } else {
                                        callback(500, {
                                            Error: 'Could not create the check for this user',
                                        })
                                    }
                                })

                            } else {
                                callback(400, {
                                    Error: 'The user already has the maximum number of checks ('+config.maxChecks+')',
                                })
                            }
                        } else {
                            callback(403, {
                                Error: 'User not found',    
                            })
                        }
                    })
                } else {
                    callback(403, {
                        Error: 'Token is  not found or is invalid',
                    });
                }
            })
        } else {
            callback('403', {
                Error: 'Missing required field or token id is invalid',
            })
        }

    } else {
        callback(400, {
            Error: 'Missing required field(s)',
        })
    }
     
}
 

/**
 * Getting Checks 
 */


handler._checks.get = (data, callback) => {
    let checkid = (typeof data.queryString.id) === 'string' && data.queryString.id.trim().length > 0 ? data.queryString.id.trim() : false;

    if (checkid) {
        // Read check in file
        _data.read('checks', checkid, (err, checkData) => {
            if (!err && checkData) {
                // Get the token from headers
                let token = (typeof data.headers.token) === 'string' && data.headers.token.trim().length === 20 ? data.headers.token.trim() : false;

                // Confirm token belongs to user that created the check data
                handler._tokens.verify('token', token, checkData.phone, (isValid) => {
                    if (isValid) {
                        callback(200, checkData);
                    } else {
                        callback(403)
                    }
                })


            } else {
                callback(403, {
                    Error:  'Check  does not  exist',
                })
            }
        })
    } else {
        callback(400, {
            Error: 'Missing required field(s)',
        })
    }
}

/**
 * Put request for checks
 */

handler._checks.put = (data, callback) => {
    // Check required  field
    let checkid = (typeof data.queryString.id) === 'string' && data.queryString.id.trim().length === 20 ? data.queryString.id.trim() : false
    
    //  Check optional fields for this put request.

    let protocol = (typeof data.payload.protocol) === 'string' && ['http', 'https'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;

    let url = (typeof data.payload.url) === 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;

    let method = (typeof data.payload.method) === 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;

    let successCodes = (typeof data.payload.successCodes) === 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.trim().length > 0 ? data.payload.successCode : false;

    let timeoutSeconds = (typeof data.payload.timeoutSeconds) === 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

    if (checkid) {
        if (protocol || url || method || successCodes || timeoutSeconds) {
            //Read checkid  in check  file
            _data.read('checks', checkid, (err, checkData) => {
                if (!err && checkData) {
                    let token = (typeof data.headers.token) === 'string' && data.headers.token.trim().length === 20 ? data.headers.token.trim() : false;
                    // Verify token belongs to user that  created the check
                    handler._tokens.verify('tokens', token, (isValid) => {
                        if (isValid) {

                            // Check for optional data that requires an  update.
                            if (protocol) {
                                checkData.protocol = protocol;
                            }
                            if (url) {
                                checkData.url = url;
                            }
                            if (method) {
                                checkData.method = method;
                            }
                            if (successCodes) {
                                checkData.successCode = successCodes;
                            }
                            if (timeoutSeconds) {
                                checkData.timeoutSeconds = timeoutSeconds;
                            }

                            // Update the check data
                            _data.update('checks', checkid, checkData, (err) => {
                                if (!err) {
                                    callback(200);
                                } else {
                                    callback(500, {
                                        Error:  'Could  not update the check data',
                                    })
                                }
                            })
                        } else {
                            callback(403);
                        }
                    })
                } else {
                    callback(400, {
                        Error: 'Check id provided is invalid',
                    })
                }
            })
        } else {
            callback(400, {
                Error: 'Missing required field(s)',
            })
        }
    } else {
        callback(400, {
            Error: 'Missing required field(s)',
        })
    }


}


/**
 * Delete request for checks
 */

handler._checks.delete = (data, callback) => {
    let checkid = (typeof data.queryString.id) === 'string' && data.queryString.id.trim().length === 20 ? data.queryString.id.trim() : false;

    if (checkid) {
        _data.read('checks', checkid, (err, checkData) => {
            if (!err && checkData) {
                let tokenid = (typeof data.headers.token) === 'string' && data.headers.token.trim().length === 20 ? data.headers.token.trim() : false;

                handler._tokens.verify(tokenid, checkData.phone, (isValid) => {
                    if (isValid) {
                        
                        _data.delete('checks', checkid, (err) => {
                            if (!err) {
                                //  Look  up the  user
                                _data.read('users', checkData.phone, (err, userData) => {
                                    if (!err && userData) {
                                        //Initialise the check key in the user file
                                        let userCheck = (typeof userData.check) === 'object' && userData.check instanceof Array && userData.check.length > 0 ? userData.check : [];

                                        //  Get  index of checkid in user check object and remove corresponding value
                                        let checkIndex = userCheck.indexOf(checkid);
                                        if (checkIndex > -1) {
                                            userCheck.splice(checkIndex, 1);
                                            
                                            // Save new check object to user file
                                            _data.update('users', checkData.phone, userData, (err) => {
                                                if (!err) {

                                                } else {
                                                    callback(500, {
                                                        Error: 'Could not update the user check object',
                                                    })
                                                }
                                            })

                                        } else {
                                            callback(500, {
                                                Error: 'Could not find the check for this user',
                                            })
                                        }
                                        
                                    } else {
                                        callback(500, {
                                            Error: 'Could not find user that created this check',
                                        })
                                    }
                                })
                            } else {
                                callback(500, {
                                    Error:  'Could not delete the check',
                                })
                            }
                        })
                    } else {
                        callback(403)
                    }
                })
            } 
        })
    } else {
        callback(400, {
            Error: 'Check does not exist',
        })
    }
}


handler.ping = (data, callback) => {
    callback(200);
}

handler.notFound = (data, callback) => {
    callback(404);
}


module.exports = handler;