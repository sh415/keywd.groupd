
/** express */
const express = require('express')
const app = express();
const { swaggerUi, specs } = require('./swagger');

/** modules */
const path = require('path');
const cors = require('cors');

/** router */
const indexRouter = require('./router/index');

/** .env */ 
require('dotenv').config();
const PORT = process.env.PORT;
const server = require('http').createServer(app);

const main = async () => {
    app.use(express.static(path.join(__dirname, 'public')));
    app.use(cors());
    app.use(express.json());
    app.use('/', indexRouter);
    app.use("/docs", swaggerUi.serve, swaggerUi.setup(specs));

    server.listen(PORT, ()=> {
        console.log(`keywd 서버가 http://localhost:${PORT} 에서 실행중입니다.`);
    });
}

main();