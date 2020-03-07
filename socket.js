let io;

module.exports.init = (httpServer) => {
    io = require('socket.io')(httpServer);
};

module.exports.get = () => {
    if (!io) {
        throw new Error("Socket IO is not initialized");
    }
    return io;
};