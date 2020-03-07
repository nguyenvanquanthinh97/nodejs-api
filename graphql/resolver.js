const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('@hapi/joi');

const User = require('../model/user');
const Post = require('../model/post');

module.exports = {
    createUser: async ({ userInput }, req) => {
        const schema = Joi.object().keys({
            email: Joi.string().trim().email().required(),
            name: Joi.string().trim().optional().allow(null, ''),
            password: Joi.string().trim().min(5).required()
        });

        const { error, value } = schema.validate({ email: userInput.email, name: userInput.name, password: userInput.password });

        if (error) {
            const err = new Error('Invalid input');
            err.statusCode = 422;
            err.data = error;
            throw err;
        }

        const user = await User.findOne({ email: userInput.email });
        if (user) {
            const error = new Error('Account already existed');
            error.statusCode = 422;
            throw error;
        }
        const hashedPassword = await bcrypt.genSalt(12).then(salt => bcrypt.hash(userInput.password, salt));
        const newUser = new User({
            name: userInput.name,
            email: userInput.email,
            password: hashedPassword
        });
        const createdUser = await newUser.save();

        return { ...createdUser._doc, _id: createdUser._id.toString() };
    },

    login: async ({ email, password }) => {
        try {
            const user = await User.findOne({ email: email });
            if (!user) {
                const error = new Error("Can't find user with that email");
                error.statusCode = 401;
                throw error;
            }
            const passwordCompared = await bcrypt.compare(password, user.password);
            if (!passwordCompared) {
                const error = new Error("Wrong input password");
                error.statusCode = 401;
                throw error;
            }
            const token = jwt.sign({ userId: user._id.toString(), email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
            return { token, userId: user._id.toString() };
        } catch (error) {
            throw error;
        }
    },

    createPost: async ({ postInput }, req) => {
        if (!req.isAuth) {
            const error = new Error('Unauthorization User');
            error.statusCode = 422;
            throw error;
        }
        const title = postInput.title;
        const content = postInput.content;
        const imageUrl = postInput.imageUrl;

        const schema = Joi.object().keys({
            title: Joi.string().trim().min(5).required(),
            content: Joi.string().trim().min(5).required()
        });

        const { error, value } = schema.validate({ title, content });

        if (error) {
            const err = new Error('Validator error');
            err.statusCode = 422;
            throw err;
        }

        try {
            const user = await User.findById(req.userId);
            if (!user) {
                const error = new Error("Can't find User with your UserId");
                error.statusCode = 422;
                throw error;
            }
            const post = new Post({
                title: value.title,
                content: value.content,
                imageUrl,
                creator: user
            });
            const postCreated = await post.save();
            user.posts.push(postCreated);
            console.log(postCreated);
            await user.save();
            return { ...postCreated._doc, createdAt: postCreated.createdAt.toISOString(), updatedAt: postCreated.updatedAt.toISOString() };
        } catch (error) {
            throw error;
        }
    },

    editPost: async ({ postInput, postId }, req) => {
        if (!req.isAuth) {
            const error = new Error('Unauthorization User');
            error.statusCode = 422;
            throw error;
        }
        const title = postInput.title;
        const content = postInput.content;
        const imageUrl = postInput.imageUrl;

        const schema = Joi.object().keys({
            title: Joi.string().trim().min(5).required(),
            content: Joi.string().trim().min(5).required()
        });

        const { error, value } = schema.validate({ title, content });

        if (error) {
            const err = new Error('Validator error');
            err.statusCode = 422;
            throw err;
        }

        try {
            const post = await Post.findById(postId);
            if (!post) {
                const error = new Error("Can't find post with this PostId");
                error.statusCode = 422;
                throw error;
            }
            post.title = title;
            post.content = content;
            post.imageUrl = imageUrl;
            const postEdit = await post.save();
            return { ...postEdit._doc, updatedAt: postEdit.updatedAt.toISOString(), createdAt: postEdit.createdAt.toISOString() };
        } catch (error) {
            throw error;
        }
    },

    getPosts: async ({page}, req) => {
        if (!req.isAuth) {
            const error = new Error('Unauthorization User');
            error.statusCode = 422;
            throw error;
        }

        if(!page) {
            page = 1;
        }

        const perPage = 2;

        try {
            const totalPost = await Post.find().countDocuments();
            const posts = await Post.find().sort({ createdAt: -1 }).skip((page-1)*perPage).limit(perPage).populate('creator');
            return { posts: posts.map(post => {
                return {...post._doc,
                    createdAt: post.createdAt.toISOString(),
                    updatedAt: post.updatedAt.toISOString() 
                }
            }), totalPost };
        } catch (error) {
            throw error;
        }
    },

};