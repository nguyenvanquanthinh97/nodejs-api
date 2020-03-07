const { get } = require('lodash');
const Joi = require('joi');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../model/user');

module.exports.signup = (req, res, next) => {
    const name = get(req.body, 'name');
    const email = get(req.body, 'email');
    const password = get(req.body, 'password');

    const schema = Joi.object().keys({
        name: Joi.string().trim().required(),
        email: Joi.string().trim().email(),
        password: Joi.string().trim().min(5)
    });

    const { error, value } = schema.validate({ name, email, password });

    if (error) {
        const err = new Error(error);
        err.statusCode = 422;
        throw err;
    }

    return bcrypt.hash(value.password, 12)
        .then(hashedPassword => {
            const user = new User({
                name: value.name,
                email: value.email,
                password: hashedPassword
            });
            return user.save();
        })
        .then(user => res.status(201).json({ message: "Sign up success", userId: user._id }))
        .catch(error => next(error));
};

module.exports.signin = (req, res, next) => {
    const email = get(req.body, 'email');
    const password = get(req.body, 'password');
    let loadedUser;

    const schema = Joi.object().keys({
        email: Joi.string().trim().email().required(),
        password: Joi.string().min(5)
    });

    const { error, value } = schema.validate({ email, password });

    if (error) {
        console.log(error);
        const err = new Error("Validation Error");
        err.statusCode = 402;
        throw err;
    }

    return User.findOne({ email: value.email })
        .then(user => {
            if (!user) {
                const error = new Error("Can't find account with this email");
                error.statusCode = 402;
                throw error;
            }
            loadedUser = user;
            return bcrypt.compare(value.password, user.password);
        })
        .then(result => {
            if (result) {
                const token = jwt.sign({ email: loadedUser.email, userId: loadedUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
                return res.status(200).json({ message: "Sign in success", token, userId: loadedUser._id });
            }
            const user = new Error("Password wrong");
            user.statusCode = 402;
            throw error;
        })
        .catch(error => {
            if (!error.statusCode) {
                error.statusCode = 500;
            }
            next(error);
        });
};