/* eslint-disable no-unused-vars */

// initialize express
const express = require("express");
const app = express();
var methodOverride = require("method-override");
app.use(methodOverride("_method"));

var moment = require("moment");

const { User, Sport, Session, UserSession } = require("./models");

const flash = require("connect-flash");
const path = require("path");
// eslint-disable-next-line no-undef
app.set("views", path.join(__dirname, "views"));
app.use(flash());

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
            return done(null, false, { message: "Incorrect Password" });
          }
        })
        .catch((error) => {
          return done(null, false, { message: "Incorrect Email" });
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

app.use(function (request, response, next) {
  response.locals.messages = request.flash();
  next();
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
  async (request, response) => {
    const user = request.user;
    const sportName = await Sport.getSportName();
    response.render("admin/index", {
      user,
      sportName,
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
      const sport = await Sport.addSport({
        name: request.body.name,
      });
      request.flash("success", "Sport created successfully!");
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
  let isAdmin = 0;
  if (request.body.isAdmin != null) {
    isAdmin = 1;
  }
  if (_password == cPassword) {
    const hashPwd = await bcrypt.hash(_password, saltRounds);
    try {
      const user = await User.addUser({
        name: request.body.name,
        email: request.body.email,
        pwd: hashPwd,
        isAdmin: isAdmin,
      });

      request.login(user, (err) => {
        if (err) {
          console.log(err);
        }
        request.flash("success", "Successfully Registered!");
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
    failureFlash: true,
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

app.get(
  "/sportDetail/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const sportDetail = await Sport.specificSport(request.params.id);
    const user = request.user;
    const session = await Session.getSessionDetail(request.params.id);
    response.render("sportDetail", {
      user,
      sportDetail,
      session,
      moment: moment,
      csrfToken: request.csrfToken(),
    });
  }
);

app.get(
  "/sportEdit/:id",
  connectEnsureLogin.ensureLoggedIn(),
  requireAdmin,
  async (request, response) => {
    const user = request.user;
    const sportDetail = await Sport.specificSport(request.params.id);
    response.render("admin/sportEdit", {
      user,
      sportDetail,
      csrfToken: request.csrfToken(),
    });
  }
);

app.put(
  "/sportEdit/:id",
  connectEnsureLogin.ensureLoggedIn(),
  requireAdmin,
  async function (request, response) {
    var name = request.body.name;
    var id = request.params.id;
    try {
      await Sport.editSport(name, id);
      request.flash("success", "Successfully updated!");
      response.redirect("/sportDetail/" + id);
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.delete(
  "/sportEdit/:id",
  connectEnsureLogin.ensureLoggedIn(),
  requireAdmin,
  async function (request, response) {
    try {
      await Sport.remove(request.params.id);
      await Session.deleteSessionBySport(request.params.id);
      request.flash("success", "Successfully deleted!");
      response.redirect("/admin");
    } catch (error) {
      return response.status(422).json(error);
    }
  }
);

app.get("/getSportJson", async function (request, response) {
  try {
    const sports = await Sport.getSportName();
    return response.json(sports);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.get(
  "/sessionCreate/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    const user = request.user;
    const sportDetail = await Sport.specificSport(request.params.id);
    response.render("sessionCreate", {
      user,
      sportDetail,
      csrfToken: request.csrfToken(),
    });
  }
);

app.post(
  "/sessionCreate/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    let sportId = request.params.id;
    const user = request.user;
    try {
      const session = await Session.addSession({
        place: request.body.place,
        dateTime: request.body.dateTime,
        players: request.body.players,
        slot: request.body.slot,
        sportId: sportId,
        userId: user.id,
      });
      request.flash("success", "Session created successfully!");
      response.redirect("/sportDetail/" + sportId);
    } catch (err) {
      console.log(err);
    }
  }
);

app.get(
  "/sessionDetail/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    const user = request.user;
    const sessionDetail = await Session.getSpecificSession(request.params.id);
    const sportDetail = await Sport.specificSport(sessionDetail.sportId);
    let isJoined = await UserSession.isJoinded(user.id, sessionDetail.id);
    let players = [];
    if (sessionDetail.players.length != 0) {
      players = sessionDetail.players.split(",");
    }
    let originalLength = players.length;
    let usersJoined = await UserSession.usersJoined(user.id, sessionDetail.id);
    if (isJoined.length != 0) {
      players.push(user.name);
    }
    if (usersJoined.length != 0) {
      for (let i = 0; i < usersJoined.length; i++) {
        let specificUser = await User.getName(usersJoined[i].userId);
        players.push(specificUser.name);
      }
    }
    response.render("sessionDetail", {
      isJoined,
      user,
      moment: moment,
      sessionDetail,
      sportDetail,
      players,
      originalLength,
      csrfToken: request.csrfToken(),
    });
  }
);

app.delete(
  "/leaveSession/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    try {
      await UserSession.userLeave(request.user.id, request.params.id);
      request.flash("success", "You have leaved your session!");
      return response.json({
        success: true,
      });
    } catch (error) {
      return response.status(422).json(error);
    }
  }
);

app.post(
  "/joinSession/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    try {
      await UserSession.joinSession(request.user.id, request.params.id);
      request.flash("success", "You have joined this session!");
      return response.json({
        success: true,
      });
    } catch (error) {
      return response.status(422).json(error);
    }
  }
);

app.put(
  "/removePlayer/:id/:name",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    try {
      const sessionDetail = await Session.getSpecificSession(request.params.id);
      let players = sessionDetail.players.split(",");
      let name = request.params.name;
      for (let i = 0; i < players.length; i++) {
        if (name.localeCompare(players[i]) == 0) {
          players.splice(i, 1);
        }
      }
      players = players.toString();
      await Session.updatePlayer(request.params.id, players);
      request.flash("success", "You have removed the player!");
      response.redirect("/sessionDetail/" + request.params.id);
    } catch (error) {
      return response.status(422).json(error);
    }
  }
);

app.get(
  "/sessionEdit/:id/:sportId",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    const user = request.user;
    const sportDetail = await Sport.specificSport(request.params.sportId);
    const sessionDetail = await Session.getSpecificSession(request.params.id);
    let dateTime = moment(sessionDetail.dateTime).format("YYYY-MM-DDTHH:mm");
    response.render("sessionEdit", {
      user,
      sportDetail,
      sessionDetail,
      dateTime,
      csrfToken: request.csrfToken(),
    });
  }
);

app.put(
  "/sessionEdit/:id/:sportId",
  connectEnsureLogin.ensureLoggedIn(),
  requireAdmin,
  async function (request, response) {
    try {
      await Session.editSession({
        place: request.body.place,
        dateTime: request.body.dateTime,
        players: request.body.players,
        slot: request.body.slot,
        sessionId: request.params.id,
        sportId: request.params.sportId,
        userId: request.user.id,
      });
      request.flash("success", "Successfully updated!");
      response.redirect("/sessionDetail/" + request.params.id);
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

module.exports = app;

// when rendering ejs page
// add -> csrf: request.csrfToken()
