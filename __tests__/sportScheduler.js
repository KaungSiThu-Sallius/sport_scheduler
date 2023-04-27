/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
const request = require("supertest");

const db = require("../models/index");
const app = require("../app");

var cheerio = require("cheerio");
const { parse } = require("pg-protocol");

let server, agent;

function extractCsrfToken(res) {
  var $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}

const login = async (agent, username, password) => {
  let res = await agent.get("/login");
  let csrfToken = extractCsrfToken(res);
  res = await agent.post("/session").send({
    email: username,
    password: password,
    _csrf: csrfToken,
  });
};

describe("Sport Scheduler", function () {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(4000, () => {});
    agent = request.agent(server);
  });

  afterAll(async () => {
    try {
      await db.sequelize.close();
      await server.close();
    } catch (error) {
      console.log(error);
    }
  });

  test("Sign Up", async () => {
    let res = await agent.get("/signUp");
    const csrfToken = extractCsrfToken(res);
    res = await agent.post("/users").send({
      name: "Kaung",
      email: "kaung@test.com",
      password: "1234",
      c_password: "1234",
      _csrf: csrfToken,
    });
    expect(res.statusCode).toBe(302);
  });
});
