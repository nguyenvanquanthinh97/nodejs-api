const express = require('express');

const feedController = require('../controller/feed');
const authentication = require('../middleware/authentication');

const router = express.Router();

router.get('/posts', authentication, feedController.getPosts);

router.post('/post', authentication, feedController.createPost);

router.get('/post/:postId', authentication, feedController.getPost);

router.put('/post/:postId', authentication, feedController.updatePost);

router.delete('/post/:postId', authentication, feedController.deletePost);

module.exports = router;