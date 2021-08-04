const environment = {};

environment.staging = {
    'httpPort': 2021,
    'httpsPort': 2022,
    'envName': 'Staging',
    'hashKey': 'crouchingTiger', 
    'maxChecks': 5,
    'twilio': {
        'accountSid': 'ACb32d411dad7fe88aac54c665d25e5c5d',
        'authToken': '9455e3eb3109edc12e3d8c92768f7a67',
        'fromPhone': '+15005550006',
    },
};

environment.production = {
    'httpPort': 2023,
    'httpsPort': 2024,
    'envName': 'Production',
    'hashKey': 'sleepingTiger',
    'maxChecks': 5,
    'twilio': {
        'accountSid': 'ACb32d411dad7fe88aac54c665d25e5c5d',
        'authToken': '9455e3eb3109edc12e3d8c92768f7a67',
        'fromPhone': '+15005550006',
    } ,
};

const activeEnvironment = typeof(process.env.NODE_ENV) === 'string' ? process.env.NODE_ENV.toLowerCase() : '';

const environmentToExport = typeof(environment[activeEnvironment]) === 'object' ?
    environment[activeEnvironment] :
    environment['staging'];


module.exports = environmentToExport;