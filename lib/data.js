const fs = require('fs'); 
const path = require('path');

// Container to export the library 
let lib = {};

// Get base directory
lib.baseDir = path.join(__dirname + '/../.data/');

// Writing to a file
lib.create = (dir, file, data, callback) => {
    fs.open(lib.baseDir + dir + '/' + file + '.json', 'wx', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {

            // Convert data (json object) to string
            const stringData = JSON.stringify(data);

            // Writing string data to the new file 
            fs.writeFile(fileDescriptor, stringData, function(err){
                if (!err) {
                    //  Close file after writing new data to it
                    fs.close(fileDescriptor, function(err) {
                        if (!err) {
                            callback(false);
                        } else {
                            callback('Error closing file');
                        }
                    });
                } else {
                    callback('Error writing to new file');
                }
            });
        } else {
            callback('Error creating new file, file  could already exist');
        }
    });  
};

// Reading from file (DB)

lib.read = (dir, file, callback) => {
    fs.readFile(lib.baseDir + dir + '/' + file + '.json', 'utf-8', (err, data) => {
        if (!err && data) {
            let parsedData = helpers.parseJsonToObject(data);
            return parsedData;
        } else {
            callback(err, data);
        }
    });
};

lib.update = (dir, file, data, callback) => {
    fs.open(lib.baseDir + dir + '/' + file + '.json', 'r+', function (err, fileDescriptor) {
        if (!err && fileDescriptor) {
            let stringData = JSON.stringify(data);

            // Truncate the file.
            fs.ftruncate(fileDescriptor, function (err) {
                if (!err) {
                    fs.writeFile(fileDescriptor, stringData, function (err) {
                        if (!err) {
                            fs.close(fileDescriptor, function (err) {
                                if (!err) {
                                    callback(false);
                                } else {
                                    callback('Could not close existing file after update was performed');
                                }
                            }) 
                        } else {
                            callback('Could not write to existing  file because  of ' + err);
                        }
                    })
                } else {
                    callback('Error truncating file');
                }
            });
        } else {
            callback('Could not open file for updating,  file could already exist');
        }
    });
} 

lib.delete = (dir, file, callback) => {
    // Unlink from fs
    fs.unlink(lib.baseDir + dir + '/' + file + '.json', function (err) {
        if (!err) {
            callback(false);
        } else {
            callback('Error deleting from the file system');
        }
    })
}

 
lib.list = (dir, callback) => {
    // use fs inbuilt lib to list dir
    fs.readdir(lib.baseDir + dir + '/', (err, data) => {
        if (!err && data && data.length > 0) {
            let trimmedFilenames = [];
            data.forEach((filename) => {
                trimmedFilenames.push(filename.replace('.json', ''));
            })
            callback(false, trimmedFilenames);
        } else {
            callback(err, data);
        }
    })
}


module.exports = lib;