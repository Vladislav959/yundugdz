const express = require("express");
const app = express();
const http = require("http").createServer(app);

const subdomain = require('express-subdomain');
const cors = require('cors');

app.options('*', cors())
app.use(cors())
const PORT = process.env.PORT || 5000;

const appRouter = express.Router();
const proxy = require('express-http-proxy')
appRouter.use('/proxy', proxy('https://gdz.ru'))
appRouter.get('/',(req,res)=>{

})
app.use(subdomain('api',appRouter))
app.get('/',(req,res)=>{
    res.end('something is building...')
})
app.set('port', PORT);
http.listen(PORT);