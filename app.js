/* eslint-disable no-unused-vars */

// initialize express
const express = require("express");
const app = express();

const { User } = require("./models");

//csrf
var csrf = require("tiny-csrf");
var cookieParser = require("cookie-parser");

//for use json file
const bodyParser = require("body-parser");
app.use(bodyParser.json());

// hasing
const bcrypt = require("bcrypt");
const saltRounds = 10;

//authentication
const passport = require("passport");
const connectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const LocalStrategy = require("passport-local");

app.use(
  session({
    secret: "my-super-secret-key-1233243254645735",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
    },
    resave: true,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy(
    {
      userNameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      User.findOne({
        where: {
          email: username,
          password: password,
        },
      })
        .then((user) => {
          return done(null, user);
        })
        .catch((error) => {
          return error;
        });
    }
  )
);

passport.serializeUser((user, done) => {
  console.log("Serializing user in session");
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findByPk(id)
    .then((user) => {
      done(null, user);
    })
    .catch((error) => {
      done(error, null);
    });
});

//for use ejs file
app.set("view engine", "ejs");

//for css
app.use(express.static("public"));

//for form post request
app.use(express.urlencoded({ extended: false }));

//add csrf
app.use(cookieParser("shh! some secret string"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));

app.get("/", connectEnsureLogin.ensureLoggedIn(), (request, response) => {
  response.render("player/index");
});

app.get("/signUp", (request, response) => {
  response.render("signup", {
    csrfToken: request.csrfToken(),
  });
});

app.get("/login", (request, response) => {
  response.render("login", {
    csrfToken: request.csrfToken(),
  });
});

app.post("/users", async (request, response) => {
  let _password = request.body.password;
  let cPassword = request.body.c_password;
  if (_password == cPassword) {
    const hashPwd = await bcrypt.hash(_password, saltRounds);
    try {
      const user = await User.create({
        name: request.body.name,
        email: request.body.email,
        password: hashPwd,
        isAdmin: 0,
      });
      request.login(user, (err) => {
        if (err) {
          console.log(err);
        }
        response.redirect("/");
      });
    } catch (err) {
      console.log(err);
    }
  }
});

module.exports = app;

// when rendering ejs page
// add -> csrf: request.csrfToken()
