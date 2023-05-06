"use strict";
const { Model, Op } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class UserSession extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }

    static async isJoinded(userId, sessionId) {
      return this.findAll({
        where: {
          userId,
          sessionId,
        },
      });
    }

    static async usersJoined(userId, sessionId) {
      return this.findAll({
        where: {
          userId: {
            [Op.ne]: userId,
          },
          sessionId,
        },
      });
    }

    static async userLeave(userId, sessionId) {
      return this.destroy({
        where: {
          userId,
          sessionId,
        },
      });
    }

    static async joinSession(userId, sessionId) {
      return this.create({
        userId,
        sessionId,
      });
    }

    static remove(sessionId) {
      return this.destroy({
        where: {
          sessionId,
        },
      });
    }
    static async _userSession(userId) {
      return this.findAll({
        where: {
          userId,
        },
      });
    }

    static async getUserId(sessionId) {
      return this.findOne({
        where: {
          sessionId,
        },
      });
    }
  }
  UserSession.init(
    {
      userId: DataTypes.INTEGER,
      sessionId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "UserSession",
    }
  );
  return UserSession;
};
