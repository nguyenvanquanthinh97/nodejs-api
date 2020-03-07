require('dotenv').config();
const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { get } = require('lodash');
const multer = require('multer');
const moment = require('moment');
const graphqlHTTP = require('express-graphql');

const grapqlSchema = require('./graphql/schema');
const grapqlResolver = require('./graphql/resolver');
const feedRoute = require('./routes/feed');
const authRoute = require('./routes/auth');
const authentication = require('./middleware/authentication');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

const port = process.env.PORT || 5000;

app.use('/test', (req, res, next) => {
    const date = moment();

    res.json({ date });
});

const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join('public', 'images'));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const filter = (req, file, cb) => {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg') {
        cb(null, true);
    } else {
        cb(null, false);
    }
};

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(multer({ storage: fileStorage, fileFilter: filter }).single('image'));

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if(req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(authentication);

app.use("/graphql", graphqlHTTP({
    schema: grapqlSchema,
    rootValue: grapqlResolver,
    graphiql: true,
    customFormatErrorFn(error) {
        if (!error.originalError) {
            return error;
        }
        const message = error.message;
        const status = error.originalError.statusCode || 500;
        return { message, status};
    }
}));

// app.use('/feed', feedRoute);
// app.use('/auth', authRoute);

app.use((error, req, res, next) => {
    console.log(error);
    const message = get(error, 'message');
    const status = get(error, 'statusCode') || 500;
    res.status(status).json({ message: message });
});

// app.listen(port, () => {
//     console.log('server is listening on port', port);
// });

mongoose.connect(process.env.MONGODB_URL)
    .then((result) => {
        const server = app.listen(port);
        // const io = require('./socket').init(server);
        // io.on('connection', (socket) => {
        //     console.log('Client Connect');
        // });
    })
    .catch(err => console.log(err));