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
      isAdmin: true,
      _csrf: csrfToken,
    });
    expect(res.statusCode).toBe(302);
  });

  test("Creates a new sport", async () => {
    const agent = request.agent(server);
    await login(agent, "kaung@test.com", "1234");
    const res = await agent.get("/createSport");
    const csrfToken = extractCsrfToken(res);
    const response = await agent.post("/createSport").send({
      name: "Football",
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });

  test("Update sport", async () => {
    const agent = request.agent(server);
    await login(agent, "kaung@test.com", "1234");
    let res = await agent.get("/createSport");
    let csrfToken = extractCsrfToken(res);
    const response = await agent.post("/createSport").send({
      name: "Football",
      _csrf: csrfToken,
    });

    let groupedSportResponse = await agent
      .get("/getSportJson")
      .set("Accept", "application/json");
    let parsedGroupedResponse = JSON.parse(groupedSportResponse.text);
    let sportCount = parsedGroupedResponse.length;
    let latestSport = parsedGroupedResponse[sportCount - 1];

    res = await agent.get(`/sportEdit/${latestSport.id}`);
    csrfToken = extractCsrfToken(res);

    await agent.put(`/sportEdit/${latestSport.id}`).send({
      _csrf: csrfToken,
      name: "Footballs",
    });

    groupedSportResponse = await agent
      .get("/getSportJson")
      .set("Accept", "application/json");
    parsedGroupedResponse = JSON.parse(groupedSportResponse.text);
    sportCount = parsedGroupedResponse.length;
    latestSport = parsedGroupedResponse[sportCount - 1];

    let afterUpdate = latestSport.name;

    expect(afterUpdate).toBe("Footballs");
  });

  test("Delete sport", async () => {
    const agent = request.agent(server);
    await login(agent, "kaung@test.com", "1234");
    let res = await agent.get("/createSport");
    let csrfToken = extractCsrfToken(res);
    const response = await agent.post("/createSport").send({
      name: "Football",
      _csrf: csrfToken,
    });

    let groupedSportResponse = await agent
      .get("/getSportJson")
      .set("Accept", "application/json");
    let parsedGroupedResponse = JSON.parse(groupedSportResponse.text);
    let beforeDeleteCount = parsedGroupedResponse.length;
    let latestSport = parsedGroupedResponse[beforeDeleteCount - 1];

    res = await agent.get(`/sportDetail/${latestSport.id}`);
    csrfToken = extractCsrfToken(res);

    await agent.delete(`/sportEdit/${latestSport.id}`).send({
      _csrf: csrfToken,
    });

    groupedSportResponse = await agent
      .get("/getSportJson")
      .set("Accept", "application/json");
    parsedGroupedResponse = JSON.parse(groupedSportResponse.text);
    let afterDeleteCount = parsedGroupedResponse.length;
    latestSport = parsedGroupedResponse[afterDeleteCount - 1];

    expect(beforeDeleteCount - 1).toBe(afterDeleteCount);
  });

  test("Creates a new session", async () => {
    const agent = request.agent(server);
    await login(agent, "kaung@test.com", "1234");

    let res = await agent.get("/createSport");
    let csrfToken = extractCsrfToken(res);
    let response = await agent.post("/createSport").send({
      name: "Football",
      _csrf: csrfToken,
    });

    let groupedSportResponse = await agent
      .get("/getSportJson")
      .set("Accept", "application/json");
    let parsedGroupedResponse = JSON.parse(groupedSportResponse.text);
    let sportCount = parsedGroupedResponse.length;
    let latestSport = parsedGroupedResponse[sportCount - 1];

    res = await agent.get(`/sessionCreate/${latestSport.id}`);
    csrfToken = extractCsrfToken(res);
    response = await agent.post(`/sessionCreate/${latestSport.id}`).send({
      place: "Marwadi Backyard",
      dateTime: "2023-05-01 15:55:00+05:30",
      players: "Sim,Loki,Thor",
      slot: 2,
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });

  test("Update session", async () => {
    const agent = request.agent(server);
    await login(agent, "kaung@test.com", "1234");

    let groupedSportResponse = await agent
      .get("/getSportJson")
      .set("Accept", "application/json");
    let parsedGroupedResponse = JSON.parse(groupedSportResponse.text);
    let sportCount = parsedGroupedResponse.length;
    let latestSport = parsedGroupedResponse[sportCount - 1];

    let res = await agent.get(`/sessionCreate/${latestSport.id}`);
    let csrfToken = extractCsrfToken(res);
    let response = await agent.post(`/sessionCreate/${latestSport.id}`).send({
      place: "Marwadi Backyard",
      dateTime: "2023-05-01 15:55:00+05:30",
      players: "Sim,Loki,Thor",
      slot: 5,
      _csrf: csrfToken,
    });

    let groupedSessionResponse = await agent
      .get("/getSessionJson")
      .set("Accept", "application/json");
    parsedGroupedResponse = JSON.parse(groupedSessionResponse.text);
    let SessionCount = parsedGroupedResponse.length;
    let latestSession = parsedGroupedResponse[SessionCount - 1];

    let targetUpdateSlot = 5;

    await agent.put(`/sessionEdit/${latestSession.id}/${latestSport.id}`).send({
      place: "Marwadi Backyard",
      dateTime: "2023-05-01 15:55:00+05:30",
      players: "Sim,Loki,Thor",
      slot: targetUpdateSlot,
      _csrf: csrfToken,
    });

    groupedSessionResponse = await agent
      .get("/getSessionJson")
      .set("Accept", "application/json");
    parsedGroupedResponse = JSON.parse(groupedSessionResponse.text);
    SessionCount = parsedGroupedResponse.length;
    latestSession = parsedGroupedResponse[SessionCount - 1];

    let afterUpdate = latestSession.slot;

    expect(afterUpdate).toBe(targetUpdateSlot);
  });
});
