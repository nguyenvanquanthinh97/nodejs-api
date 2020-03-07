const { get } = require('lodash');
const Joi = require('joi');
const mongoose = require('mongoose');

const socket = require('../socket');
const fileHelper = require('../util/fileHelper');
const Post = require('../model/post');
const User = require('../model/user');

module.exports.getPosts = async (req, res, next) => {
    const page = req.query.page || 1;
    const perPage = 2;
    try {
        let totalItems = await Post.find().countDocuments();
        let posts = await Post.find().skip((page - 1) * perPage).limit(perPage);
        res.status(200).json({
            message: "Fetch Success",
            posts,
            totalItems
        });
    } catch (error) {
        const err = new Error(error);
        err.statusCode = 500;
        next(err);
    };
};

module.exports.createPost = (req, res, next) => {
    const title = get(req.body, 'title');
    const content = get(req.body, 'content');
    const image = req.file;

    if (!image) {
        const error = new Error("Can't detect image");
        error.statusCode = 422;
        throw error;
    }

    const schema = Joi.object().keys({
        title: Joi.string().trim().min(5),
        content: Joi.string().trim().min(5)
    });

    const { error, value } = schema.validate({ title, content });

    if (error) {
        const err = new Error("Validation Error");
        err.statusCode = 422;
        throw err;
    }

    const imageUrl = image.path.split('/').slice(1).join('/');

    const post = new Post({
        title: value.title,
        imageUrl,
        content: value.content,
        creator: req.userId
    });

    return post.save()
        .then(result => {
            return User.findById(req.userId);
        })
        .then(user => {
            user.posts.push(post);
            return user.save();
        })
        .then(result => {
            const io = socket.get();
            io.emit('post', { action: 'create', post: post });
            res.status(201).json({
                message: "Post create success",
                post: post,
                creator: { _id: result._id, name: result.name }
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.statusCode = 500;
            next(error);
        });
};

module.exports.getPost = (req, res, next) => {
    const postId = req.params.postId;
    return Post.findById(postId)
        .then(post => {
            if (!post) {
                const error = new Error("Can't find your post");
                error.statusCode = 404;
                throw error;
            }
            return res.status(200).json({ message: "Find your post success", post });
        })
        .catch(err => {
            const error = new Error(err);
            error.statusCode = 500;
            next(error);
        });
};

module.exports.updatePost = (req, res, next) => {
    const postId = req.params.postId;
    const title = req.body.title;
    const content = req.body.content;
    let imageUrl = req.body.image;

    if (req.file) {
        imageUrl = req.file.path.split('/').slice(1).join('/');
    }

    if (!imageUrl) {
        const error = new Error("No file picked");
        error.statusCode = 422;
        throw err;
    }

    const schema = Joi.object().keys({
        title: Joi.string().trim().min(5).required(),
        content: Joi.string().trim().min(5).required()
    });

    const { error, value } = schema.validate({ title, content });

    if (error) {
        const err = new Error("Validation Error");
        err.statusCode = 422;
        throw err;
    }

    Post.findById(postId)
        .then(post => {
            if (!post) {
                const error = new Error("Can't find post");
                error.statusCode = 404;
                throw error;
            }

            if (post.creator.toString() !== req.userId.toString()) {
                const error = new Error("Unathorize User");
                error.statusCode = 403;
                throw error;
            }

            if (imageUrl !== post.imageUrl) {
                fileHelper.removeFile(post.imageUrl);
            }
            post.title = value.title;
            post.imageUrl = imageUrl;
            post.content = value.content;
            return post.save();
        })
        .then(result => res.status(201).json({ message: "Update Success", post: result }))
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            return next(err);
        });

};

module.exports.deletePost = (req, res, next) => {
    const postId = req.params.postId;

    Post.findById(postId)
        .then(post => {
            if (!post) {
                const error = new Error("Invalid Post ID");
                error.statusCode = 422;
                throw error;
            }

            if (post.creator.toString() !== req.userId.toString()) {
                const error = new Error("Invalid Authorization");
                error.statusCode = 403;
                throw error;
            }
            fileHelper.removeFile(post.imageUrl);
            return Post.findByIdAndDelete(postId);
        })
        .then(result => {
            return User.findById(req.userId);
        })
        .then(user => {
            user.posts.pull(postId);
            return user.save();
        })
        .then(user => {
            res.status(200).json({ message: "Success in delete post ID" });
        })
        .catch(error => {
            if (!error.statusCode) {
                error.statusCode = 500;
            }
            next(error);
        });
};