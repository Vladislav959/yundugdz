const express = require("express");
const app = express();
const http = require("http").createServer(app);

const subdomain = require('express-subdomain');
const cors = require('cors');

app.options('*', cors())
app.use(cors())
const PORT = process.env.PORT || 5000;
const { createProxyMiddleware } = require('http-proxy-middleware');
const axios = require("axios")
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
app.get('/api/getmenu', async (req,res)=>{
    const response = await axios.get('https://gdz.ru');
    const dom = new JSDOM(response.data);
    const document = dom.window.document;
    const boxmenus = document.querySelectorAll(".box-menu > div > ul")
    let boxobject = []
    boxmenus.forEach(function(elem){
        console.log(elem.innerHTML)
        let heading = elem.querySelector(".box-menu div ul > li > a").textContent;
        if(!heading.includes("класс")){
            return;
        }
        heading = heading.replace(/(\r\n|\n|\r)/gm, "").trim();
        let subjects = [];
        const subjectelems = elem.querySelectorAll("li ul li")
        subjectelems.forEach(function(elem1){
            const headingsubject = elem1.querySelector("a").textContent
            const headinghref = elem1.querySelector("a").getAttribute("href");
            subjects.push({subject:headingsubject,href:headinghref})
        })
        boxobject.push({heading,subjects})
    })
    res.end(JSON.stringify(boxobject))
});
app.get('/api/getmenubyclass/:year', async (req,res)=>{
    console.log(req.params.year)
    const response = await axios.get('https://gdz.ru');
    const dom = new JSDOM(response.data);
    const document = dom.window.document;
    const boxmenus = document.querySelectorAll(".box-menu > div > ul")
    let boxobject = []
    boxmenus.forEach(function(elem){
        let heading = elem.querySelector(".box-menu div ul > li > a").textContent;
        if(!heading.includes(req.params.year + " класс")){
            return;
        }
        heading = heading.replace(/(\r\n|\n|\r)/gm, "").trim();
        let subjects = [];
        const subjectelems = elem.querySelectorAll("li ul li")
        subjectelems.forEach(function(elem1){
            const headingsubject = elem1.querySelector("a").textContent
            const headinghref = elem1.querySelector("a").getAttribute("href");
            subjects.push({subject:headingsubject,href:headinghref})
        })
        boxobject.push({heading,subjects})
    })
    console.log(boxobject)
    res.end(JSON.stringify(boxobject))
});
app.get('/api/getbooks', async (req,res)=>{
    console.log('https://gdz.ru' + req.query.url)
    const response = await axios.get('https://gdz.ru' + req.query.url)
    const dom = new JSDOM(response.data);
    const document = dom.window.document;
    const books = document.querySelectorAll("li.book")
    let boxobject = []
    let count = 0
    books.forEach(async function(elem){
        let object = {}
        object.href = elem.querySelector("a").getAttribute("href");
        object.cover = elem.querySelector(".book-cover img").getAttribute("data-src");
        const imageRes = await axios.get("https:" + object.cover,{
            responseType: 'arraybuffer'
          });
        object.cover = Buffer.from(imageRes.data, 'binary').toString('base64');
        object.heading = elem.querySelector(".book-description-main").textContent;
        
        object.heading = object.heading.replace(/(\r\n|\n|\r)/gm, "").trim();
        const elemsSub = elem.querySelectorAll(".book-description-sub")
        object.subs = [];
        elemsSub.forEach((elemsub)=>{
            object.subs.push(elemsub.textContent)
        })
        boxobject.push(object)
        count++;
        if(count === books.length){
            res.end(JSON.stringify(boxobject))
        }
    })
});
app.get('/api/getbook', async (req,res)=>{
    console.log('https://gdz.ru' + req.query.url)
    const response = await axios.get('https://gdz.ru' + req.query.url)
    const dom = new JSDOM(response.data);
    const document = dom.window.document;
    const elem = document.querySelector(".book")
    let boxobject = {
        info:{},
        tasks:[]
    }
        boxobject.info.cover = elem.querySelector(".for-cover img").getAttribute("data-src");
        console.log(boxobject)
        const imageRes = await axios.get("https:" + boxobject.info.cover,{
            responseType: 'arraybuffer'
          });
          console.log(imageRes.data)
        boxobject.info.cover = Buffer.from(imageRes.data, 'binary').toString('base64');
        boxobject.info.heading = document.querySelector('h1[itemprop="name"]').textContent;
        
        boxobject.info.heading = boxobject.info.heading.replace(/(\r\n|\n|\r)/gm, "").trim();
        const elemsSub = elem.querySelector(".book-description-sub")
        boxobject.info.subs = [];
        boxobject.info.subs.push("Авторы:" + elemsSub.querySelector('span[itemprop="author"]').textContent)
        elemsSub.querySelectorAll("div").forEach((elemsub)=>{
            boxobject.info.subs.push(elemsub.textContent)
        })
    if(elem.querySelector(".book-basic-info .book-description_premium__icon")){
        return res.json({premium:true,info:boxobject.info})
    }
        const tasks = document.querySelectorAll(".task-list > .section-task")
        let counter = -1;
        tasks.forEach(obj => {
            counter++;
            const isDeep = obj.querySelectorAll(".section-task");
            if(isDeep.length > 0){
                const headerMain = document.querySelectorAll('.task-list > .section-task > header')[counter];
                let headerContentMain = '';
                if(headerMain){
                    headerContentMain = headerMain.textContent
                }
                let arr = []
                isDeep.forEach(element => {
                    
                const header = element.querySelector('header');
                let headerContent = '';
                if(header){
                    headerContent = header.textContent
                }
            const links =element.querySelectorAll("div > a")
            let arr2 = []
            links.forEach(element2 => {
               
                arr2.push({href:element2.getAttribute("href"),text:element2.textContent})
               })
            arr.push({heading:headerContent,items:arr2})
                })
                boxobject.tasks.push({heading:headerContentMain,items:arr})
            }
            else{
                const header = obj.querySelector('header');
                let headerContent = '';
                if(header){
                    headerContent = header.textContent
                }
            const links = obj.querySelectorAll("div > a ")
            let arr = []
            console.log('gguvfjh')
           links.forEach(element => {
            arr.push({href:element.getAttribute("href"),text:element.textContent})
           })
           boxobject.tasks.push({heading:headerContent,items:arr})
            }
        })
            res.end(JSON.stringify(boxobject))

});
app.get('/api/gettask', async (req,res)=>{
    console.log('https://gdz.ru' + req.query.url)
    const response = await axios.get('https://gdz.ru' + req.query.url)
    const dom = new JSDOM(response.data);
    const document = dom.window.document;
    const elem = document.querySelector(".book")
    let boxobject = {
        info:{},
        images:[]
    }
        boxobject.info.cover = elem.querySelector(".for-cover img").getAttribute("data-src");
        const imageRes = await axios.get("https:" + boxobject.info.cover,{
            responseType: 'arraybuffer'
          });
          console.log(imageRes.data)
        boxobject.info.cover = Buffer.from(imageRes.data, 'binary').toString('base64');
        const elemsSub = elem.querySelector(".book-description-sub")
        boxobject.info.subs = [];
        boxobject.info.subs.push("Авторы:" + elemsSub.querySelector('span[itemprop="author"]').textContent)
        elemsSub.querySelectorAll("div").forEach((elemsub)=>{
            boxobject.info.subs.push(elemsub.textContent)
        })
        const images = document.querySelectorAll(".task-img-container")
        console.log(images)
        let counter = 0;
        images.forEach(async obj => {
            const imageRes = await axios.get("https:" + obj.querySelector("img").getAttribute("src"),{
                responseType: 'arraybuffer'
              });
            boxobject.images.push(Buffer.from(imageRes.data, 'binary').toString('base64'))
            counter++;
            if(counter === images.length){
            res.end(JSON.stringify(boxobject))
            }
        })

});
app.use('/',express.static(__dirname + "/build/"));
app.get('/*',(req,res)=>{
    res.sendFile(__dirname + "/build/index.html")
})
app.set('port', PORT);
http.listen(PORT);