/* eslint-disable no-unused-vars */

// initialize express
const express = require("express");
const app = express();

//for use json file
const bodyParser = require("body-parser");
app.use(bodyParser.json());

//for use ejs file
app.set("view engine", "ejs");

//for css
app.use(express.static("public"));

//for form post request
app.use(express.urlencoded({ extended: false }));

app.get("/", async function (request, response) {
  response.render("sessionCreate");
});

module.exports = app;
