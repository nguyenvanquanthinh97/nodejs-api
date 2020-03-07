const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    let token = req.get('Authorization');
    // console.log(req.headers);
    let decodedToken;

    if(!token) {
        req.isAuth = false;
        return next();
    }

    token = token.split(' ')[1];

    try {
        decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    } catch(err) {
        req.isAuth = false;
        return next();
    }

    if(!decodedToken) {
        req.isAuth = false;
        return next();
    }

    req.userId = decodedToken.userId;
    req.isAuth = true;
    next();
};