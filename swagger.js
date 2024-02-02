const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    swaggerDefinition: {
        info: {
            title: 'keywd_groupd API',
            version: '1.0.0',
            description: 'keywd_groupd API with express',
        },
        host: 'localhost:5055',
        basePath: '/'
    },
    apis: ['./router/*.js', './swagger/*']
};

const specs = swaggerJsdoc(options);

module.exports = {
    swaggerUi,
    specs
};