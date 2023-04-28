/* eslint-disable no-unused-vars */

// initialize express
const express = require("express");
const app = express();

const { User, Sport } = require("./models");

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
      usernameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      User.findOne({
        where: {
          email: username,
        },
      })
        .then(async (user) => {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done("Invalid Password");
          }
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

// multiuser
function requireAdmin(req, res, next) {
  if (req.user && req.user.isAdmin == true) {
    return next();
  } else {
    res.status(401).json({ message: "Unauthorized user." });
  }
}

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
  const user = request.user;
  response.render("player/index", {
    user,
  });
});

app.get(
  "/admin",
  connectEnsureLogin.ensureLoggedIn(),
  requireAdmin,
  (request, response) => {
    const user = request.user;
    response.render("admin/index", {
      user,
    });
  }
);

app.get(
  "/createSport",
  connectEnsureLogin.ensureLoggedIn(),
  requireAdmin,
  (request, response) => {
    response.render("admin/sportCreate", {
      csrfToken: request.csrfToken(),
    });
  }
);

app.post(
  "/createSport",
  connectEnsureLogin.ensureLoggedIn(),
  requireAdmin,
  async (request, response) => {
    try {
      const sport = await Sport.create({
        name: request.body.name,
      });
      response.redirect("/admin");
    } catch (err) {
      console.log(err);
    }
  }
);

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

app.post(
  "/session",
  passport.authenticate("local", {
    failureRedirect: "/login",
  }),
  (request, response) => {
    console.log(request.user);
    if (request.user.isAdmin) {
      response.redirect("/admin");
    } else {
      response.redirect("/");
    }
  }
);

app.get("/signOut", (request, response, next) => {
  request.logout((err) => {
    if (err) {
      return next(err);
    }
    response.redirect("logIn");
  });
});

module.exports = app;

// when rendering ejs page
// add -> csrf: request.csrfToken()
