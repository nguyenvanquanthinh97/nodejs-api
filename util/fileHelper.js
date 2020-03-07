const fs = require('fs');

module.exports.removeFile = (filePath) => {
    fs.unlink('public/' + filePath, (error) => console.log(error));
};