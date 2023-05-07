/* eslint-disable no-unused-vars */

// initialize express
const express = require("express");
const app = express();
var methodOverride = require("method-override");
app.use(methodOverride("_method"));

var moment = require("moment");

const {
  User,
  Sport,
  Session,
  UserSession,
  CancelSession,
} = require("./models");

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

app.get("/", connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  const user = request.user;
  if (user.isAdmin) {
    response.redirect("/admin");
  } else {
    let sessions = await UserSession._userSession(user.id);
    const sportName = await Sport.getSportName();
    let sessionArr = [];
    let sportNameArr = [];

    for (let i = 0; i < sessions.length; i++) {
      let data = await Session.getSpecificSession2(sessions[i].sessionId);
      if (data != null) {
        sessionArr.push(data);
      }
    }
    for (let j = 0; j < sessionArr.length; j++) {
      sportNameArr.push(await Sport.specificSport(sessionArr[j].sportId));
    }

    response.render("player/index", {
      user,
      sessionArr,
      sportName,
      moment: moment,
      sportNameArr,
    });
  }
});

// Authentication
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

app.get("/signUp", (request, response) => {
  response.render("signup", {
    csrfToken: request.csrfToken(),
  });
});

app.get("/login", (request, response) => {
  // await User.adduser({
  //   name: "Admin",
  //   email: "admin@gmail.com",
  //   password:
  //     "$2b$10$pP0x.znbLJroyTsvLf5IZecQtHP6S6SsR808HJEm69ckNgFTippEe",
  //   isAdmin: true,
  // })
  response.render("login", {
    csrfToken: request.csrfToken(),
  });
});

app.post("/users", async (request, response) => {
  let _password = request.body.password;
  let cPassword = request.body.c_password;
  let isAdmin = 0;
  let isEmailExist = await User.isEmailExist(request.body.email);
  if (isEmailExist.length > 0) {
    request.flash("failed", "Email already Registered!");
    response.redirect("/");
  }
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

//Sport
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

app.get(
  "/sportDetail/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const sportDetail = await Sport.specificSport(request.params.id);
      const user = request.user;
      const session = await Session.getSessionDetail(request.params.id);
      const userJoined = await UserSession._userSession(user.id);
      let joinedSessionsArr = [];
      for (let i = 0; i < userJoined.length; i++) {
        let data = await Session.getSessionById(
          userJoined[i].sessionId,
          sportDetail.id
        );
        if (data != null) {
          joinedSessionsArr.push(data);
        }
      }

      let upComingSession = [];
      let flag = 1;
      console.log("sessoinLength: " + session.length);
      console.log("Joied Length: " + joinedSessionsArr.length);
      for (let j = 0; j < session.length; j++) {
        flag = 1;
        for (let i = 0; i < joinedSessionsArr.length; i++) {
          if (session[j].id == joinedSessionsArr[i].id) {
            flag = 0;
          }
        }
        if (flag == 1) {
          upComingSession.push(session[j]);
        }
      }
      response.render("sportDetail", {
        user,
        sportDetail,
        upComingSession,
        moment: moment,
        joinedSessionsArr,
        csrfToken: request.csrfToken(),
      });
    } catch (error) {
      console.log(error);
    }
  }
);

app.get(
  "/cancelSession/:sportId/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const sportDetail = await Sport.specificSport(request.params.sportId);
      const user = request.user;
      const sessionDetail = await Session.getSpecificSession(request.params.id);
      response.render("cancelSession", {
        user,
        sessionDetail,
        sportDetail,
        moment: moment,
        csrfToken: request.csrfToken(),
      });
    } catch (error) {
      console.log(error);
    }
  }
);

app.post(
  "/cancelSession/:sportId/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    let sessionId = request.params.id;
    let reason = request.body.reason;
    const user = request.user;
    try {
      await CancelSession.create({
        sessionId: sessionId,
        reason: reason,
      });
      request.flash("success", "Session cancel successfully!");
      response.redirect("/sportDetail/" + request.params.sportId);
    } catch (err) {
      console.log(err);
    }
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
  "/sportPreviousSessionDetail/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const sportDetail = await Sport.specificSport(request.params.id);
    const user = request.user;
    const session = await Session.getPreviousSessionDetail(request.params.id);
    response.render("sportDetailPreviousSession", {
      user,
      sportDetail,
      session,
      moment: moment,
      csrfToken: request.csrfToken(),
    });
  }
);

// Sessions

app.get("/getSessionJson", async function (request, response) {
  try {
    const sessions = await Session.getData();
    return response.json(sessions);
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
      await UserSession.joinSession(request.user.id, session.id);
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
    console.log(sessionDetail);
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
    let organizerName = null;
    let organizerId = await Session.getSpecificSession(request.params.id);

    if (organizerId != null) {
      organizerName = await User.getName(organizerId.userId);
    }

    let isCancel = await CancelSession._isCancel(request.params.id);
    let isCancelShow = 1;
    if (isCancel == null) {
      isCancelShow = 0;
    }

    console.log(isCancel);
    response.render("sessionDetail", {
      isJoined,
      user,
      moment: moment,
      sessionDetail,
      sportDetail,
      players,
      originalLength,
      organizerName,
      isCancel,
      isCancelShow,
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
      let session = await Session.getSpecificSession(request.params.id);
      let slot = session.slot + 1;
      await Session.updateSlot(request.params.id, slot);
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
      let session = await Session.getSpecificSession(request.params.id);
      let slot = session.slot - 1;
      await Session.updateSlot(request.params.id, slot);
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
      let slot = sessionDetail.slot + 1;
      await Session.updateSlot(request.params.id, slot);
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

app.delete(
  "/sessionEdit/:id/:sportId",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    try {
      await CancelSession.remove(request.params.id);
      await Session.remove(request.params.id);
      await UserSession.remove(request.params.id);

      request.flash("success", "Successfully deleted!");
      response.redirect("/sportDetail/" + request.params.sportId);
    } catch (error) {
      return response.status(422).json(error);
    }
  }
);

app.get(
  "/sessionPreviousDetail/:id",
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
    response.render("previousSessionDetail", {
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

//Reports
app.get(
  "/reports",
  connectEnsureLogin.ensureLoggedIn(),
  requireAdmin,
  (request, response) => {
    response.render("admin/reports", {
      csrfToken: request.csrfToken(),
    });
  }
);

app.post(
  "/reports",
  connectEnsureLogin.ensureLoggedIn(),
  requireAdmin,
  async (request, response) => {
    let startDate = moment(request.body.start).format("YYYY-MM-DD");
    let _startDate = new Date(startDate);
    let endDate = moment(request.body.end).format("YYYY-MM-DD");
    let _endDate = new Date(endDate);
    let sportSession = await Session.allSportSessions(_startDate, _endDate);
    let totoalSessionsLength = sportSession.length;
    let sportNameArr = [];
    let _sportArr = [];
    let _sportNameArr = [];
    let _noSession = [];
    for (let j = 0; j < sportSession.length; j++) {
      let sportName = await Sport.specificSport(sportSession[j].sportId);
      sportNameArr.push(sportName);
      if (!_sportNameArr.includes(sportName.name)) {
        _sportArr[sportName.id] = sportName.name;
        _sportNameArr.push(sportName.name);
      }
    }

    for (const key in _sportArr) {
      let number = await Session.getSessionCountBySport(
        key,
        startDate,
        endDate
      );
      _noSession[_sportArr[key]] = number;
    }

    // let porpularitySport = {}

    // for (const key in _noSession) {
    //   let porpularity = _noSession[key] / totoalSessionsLength;
    //   porpularitySport[key] = porpularity;
    // }

    // for (const key in porpularitySport) {
    //   console.log(key + " " + porpularitySport[key])
    // }

    response.render("admin/reportDetails", {
      sportNameArr,
      startDate,
      endDate,
      totoalSessionsLength,
      sportSession,
      moment: moment,
      _noSession,
      csrfToken: request.body._csrf,
    });
  }
);

module.exports = app;
