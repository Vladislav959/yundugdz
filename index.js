const express = require("express");
const app = express();
const http = require("http").createServer(app);

const subdomain = require("express-subdomain");
const cors = require("cors");
const querystring = require("querystring");
const puppeteer = require("puppeteer");
app.options("*", cors());
app.use(cors());
const PORT = process.env.PORT || 5000;
const { createProxyMiddleware } = require("http-proxy-middleware");
const axios = require("axios");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
app.get("/api/getmenu", async (req, res) => {
  const response = await axios.get("https://gdz.ru");
  const dom = new JSDOM(response.data);
  const document = dom.window.document;
  const boxmenus = document.querySelectorAll(".box-menu > div > ul");
  let boxobject = [];
  boxmenus.forEach(function (elem) {
    let heading = elem.querySelector(".box-menu div ul > li > a").textContent;
    if (!heading.includes("класс")) {
      return;
    }
    heading = heading.replace(/(\r\n|\n|\r)/gm, "").trim();
    let subjects = [];
    const subjectelems = elem.querySelectorAll("li ul li");
    subjectelems.forEach(function (elem1) {
      const headingsubject = elem1.querySelector("a").textContent;
      const headinghref = elem1.querySelector("a").getAttribute("href");
      subjects.push({ subject: headingsubject, href: headinghref });
    });
    boxobject.push({ heading, subjects });
  });
  res.end(JSON.stringify(boxobject));
});
app.get("/api/getmenubyclass/:year", async (req, res) => {
  const response = await axios.get("https://gdz.ru");
  const dom = new JSDOM(response.data);
  const document = dom.window.document;
  const boxmenus = document.querySelectorAll(".box-menu > div > ul");
  let boxobject = [];
  boxmenus.forEach(function (elem) {
    let heading = elem.querySelector(".box-menu div ul > li > a").textContent;
    if (!heading.includes(req.params.year + " класс")) {
      return;
    }
    heading = heading.replace(/(\r\n|\n|\r)/gm, "").trim();
    let subjects = [];
    const subjectelems = elem.querySelectorAll("li ul li");
    subjectelems.forEach(function (elem1) {
      const headingsubject = elem1.querySelector("a").textContent;
      const headinghref = elem1.querySelector("a").getAttribute("href");
      subjects.push({ subject: headingsubject, href: headinghref });
    });
    boxobject.push({ heading, subjects });
  });
  res.end(JSON.stringify(boxobject));
});
app.get("/api/getbooks", async (req, res) => {
  const response = await axios.get("https://gdz.ru" + req.query.url);
  const dom = new JSDOM(response.data);
  const document = dom.window.document;
  const books = document.querySelectorAll("li.book");
  let boxobject = [];
  let count = 0;
  books.forEach(async function (elem) {
    let object = {};
    object.href = elem.querySelector("a").getAttribute("href");
    object.cover = elem
      .querySelector(".book-cover img")
      .getAttribute("data-src");
    const imageRes = await axios.get("https:" + object.cover, {
      responseType: "arraybuffer",
    });
    object.cover = Buffer.from(imageRes.data, "binary").toString("base64");
    object.heading = elem.querySelector(".book-description-main").textContent;

    object.heading = object.heading.replace(/(\r\n|\n|\r)/gm, "").trim();
    const elemsSub = elem.querySelectorAll(".book-description-sub");
    object.subs = [];
    elemsSub.forEach((elemsub) => {
      object.subs.push(elemsub.textContent);
    });
    boxobject.push(object);
    count++;
    if (count === books.length) {
      res.end(JSON.stringify(boxobject));
    }
  });
});
app.get("/api/getmosrutoken", async (req, res) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(
    "https://login.mos.ru/sps/login/methods/password?bo=%2Fsps%2Foauth%2Fae%3Fresponse_type%3Dcode%26access_type%3Doffline%26client_id%3Ddnevnik.mos.ru%26scope%3Dopenid%2Bprofile%2Bbirthday%2Bcontacts%2Bsnils%2Bblitz_user_rights%2Bblitz_change_password%26redirect_uri%3Dhttps%253A%252F%252Fschool.mos.ru%252Fauth%252Fmain%252Fcallback",
    { waitUntil: "networkidle0" }
  );
  page.on('request', async function requestFunc(request){
    const frame = request.frame();
    if(frame){
      if(frame.url().includes("https://dnevnik.mos.ru/?token")){
        const myURL = new URL(page.url());
      const token = myURL.searchParams.get("token");
      await browser.close();
      page.off("request",requestFunc)
      return res.json({ token });
      }
    }
  })
  await page.waitForSelector("#login");
  await page.focus('#login')
  await page.keyboard.type(req.query.login)
  
  await page.waitForSelector("#password");
  await page.focus('#password')
  await page.keyboard.type(req.query.password)
  await page.waitForSelector("button#bind");
  await page.click("button#bind");
});
app.get("/api/getbook", async (req, res) => {
  const response = await axios.get("https://gdz.ru" + req.query.url);
  const dom = new JSDOM(response.data);
  const document = dom.window.document;
  const elem = document.querySelector(".book");
  let boxobject = {
    info: {},
    tasks: [],
  };
  boxobject.info.cover = elem
    .querySelector(".for-cover img")
    .getAttribute("data-src");
  const imageRes = await axios.get("https:" + boxobject.info.cover, {
    responseType: "arraybuffer",
  });
  boxobject.info.cover = Buffer.from(imageRes.data, "binary").toString(
    "base64"
  );
  boxobject.info.heading = document.querySelector(
    'h1[itemprop="name"]'
  ).textContent;

  boxobject.info.heading = boxobject.info.heading
    .replace(/(\r\n|\n|\r)/gm, "")
    .trim();
  const elemsSub = elem.querySelector(".book-description-sub");
  boxobject.info.subs = [];
  boxobject.info.subs.push(
    "Авторы:" + elemsSub.querySelector('span[itemprop="author"]').textContent
  );
  elemsSub.querySelectorAll("div").forEach((elemsub) => {
    boxobject.info.subs.push(elemsub.textContent);
  });
  if (elem.querySelector(".book-basic-info .book-description_premium__icon")) {
    return res.json({ premium: true, info: boxobject.info });
  }
  const tasks = document.querySelectorAll(".task-list > .section-task");
  let counter = -1;
  tasks.forEach((obj) => {
    counter++;
    const isDeep = obj.querySelectorAll(".section-task");
    if (isDeep.length > 0) {
      const headerMain = document.querySelectorAll(
        ".task-list > .section-task > header"
      )[counter];
      let headerContentMain = "";
      if (headerMain) {
        headerContentMain = headerMain.textContent;
      }
      let arr = [];
      isDeep.forEach((element) => {
        const header = element.querySelector("header");
        let headerContent = "";
        if (header) {
          headerContent = header.textContent;
        }
        const links = element.querySelectorAll("div > a");
        let arr2 = [];
        links.forEach((element2) => {
          arr2.push({
            href: element2.getAttribute("href"),
            text: element2.textContent,
          });
        });
        arr.push({ heading: headerContent, items: arr2 });
      });
      boxobject.tasks.push({ heading: headerContentMain, items: arr });
    } else {
      const header = obj.querySelector("header");
      let headerContent = "";
      if (header) {
        headerContent = header.textContent;
      }
      const links = obj.querySelectorAll("div > a ");
      let arr = [];
      links.forEach((element) => {
        arr.push({
          href: element.getAttribute("href"),
          text: element.textContent,
        });
      });
      boxobject.tasks.push({ heading: headerContent, items: arr });
    }
  });
  res.end(JSON.stringify(boxobject));
});
app.get("/api/gettask", async (req, res) => {
  const response = await axios.get("https://gdz.ru" + req.query.url);
  const dom = new JSDOM(response.data);
  const document = dom.window.document;
  const elem = document.querySelector(".book");
  let boxobject = {
    info: {},
    images: [],
  };
  boxobject.info.heading = document.querySelector(
    'h1[itemprop="name"]'
  ).textContent;
  boxobject.info.cover = elem
    .querySelector(".for-cover img")
    .getAttribute("data-src");
  const imageRes = await axios.get("https:" + boxobject.info.cover, {
    responseType: "arraybuffer",
  });
  boxobject.info.cover = Buffer.from(imageRes.data, "binary").toString(
    "base64"
  );
  const elemsSub = elem.querySelector(".book-description-sub");
  boxobject.info.subs = [];
  boxobject.info.subs.push(
    "Авторы:" + elemsSub.querySelector('span[itemprop="author"]').textContent
  );
  elemsSub.querySelectorAll("div").forEach((elemsub) => {
    boxobject.info.subs.push(elemsub.textContent);
  });
  const images = document.querySelectorAll(".task-img-container");
  let counter = 0;
  images.forEach(async (obj) => {
    const imageRes = await axios.get(
      "https:" + obj.querySelector("img").getAttribute("src"),
      {
        responseType: "arraybuffer",
      }
    );
    boxobject.images.push(
      Buffer.from(imageRes.data, "binary").toString("base64")
    );
    counter++;
    if (counter === images.length) {
      res.end(JSON.stringify(boxobject));
    }
  });
});
app.use("/", express.static(__dirname + "/build/"));
app.get("/*", (req, res) => {
  res.sendFile(__dirname + "/build/index.html");
});
app.set("port", PORT);
http.listen(PORT);
