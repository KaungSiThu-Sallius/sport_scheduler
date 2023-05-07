"use strict";
const { Model, Op, where } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Session extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Session.belongsTo(models.Sport, {
        foreignKey: "sportId",
      });
      Session.belongsTo(models.User, {
        foreignKey: "userId",
      });
    }

    static async addSession({
      place,
      dateTime,
      players,
      slot,
      sportId,
      userId,
    }) {
      return this.create({ place, dateTime, players, slot, sportId, userId });
    }

    static async getSessionDetail(sportId) {
      return this.findAll({
        where: {
          sportId,
          dateTime: {
            [Op.gt]: new Date(),
          },
        },
      });
    }

    static async getPreviousSessionDetail(sportId) {
      return this.findAll({
        where: {
          sportId,
          dateTime: {
            [Op.lt]: new Date(),
          },
        },
      });
    }

    static async getSpecificSession(id) {
      return this.findByPk(id);
    }

    static async getSpecificSession2(id) {
      return this.findOne({
        where: {
          id,
          dateTime: {
            [Op.gt]: new Date(),
          },
        },
      });
    }

    static async updatePlayer(id, players) {
      return this.update(
        {
          players,
        },
        {
          where: {
            id,
          },
        }
      );
    }

    static deleteSessionBySport(sportId) {
      return this.destroy({
        where: {
          sportId,
        },
      });
    }

    static remove(id) {
      return this.destroy({
        where: {
          id,
        },
      });
    }

    static async updateSlot(id, slot) {
      return this.update(
        {
          slot: slot,
        },
        {
          where: {
            id,
          },
        }
      );
    }

    static async editSession({
      place,
      dateTime,
      players,
      slot,
      sportId,
      userId,
      sessionId,
    }) {
      return this.update(
        { place, dateTime, players, slot, sportId, userId },
        {
          where: {
            id: sessionId,
          },
        }
      );
    }

    static async getData() {
      return this.findAll();
    }

    static async allSportSessions(startDate, endDate) {
      return this.findAll({
        where: {
          dateTime: {
            [Op.and]: [
              { [Op.gte]: startDate },
              { [Op.lte]: endDate }, // Add 86399999 milliseconds to include the end dat
            ],
          },
        },
      });
    }

    static async getSessionCountBySport(sportId, startDate, endDate) {
      return this.count({
        where: {
          dateTime: {
            [Op.between]: [startDate, endDate],
          },
          sportId,
        },
      });
    }

    static async getSessionById(id, sportId) {
      return this.findOne({
        where: {
          id,
          sportId,
          dateTime: {
            [Op.gt]: new Date(),
          },
        },
      });
    }
  }
  Session.init(
    {
      place: DataTypes.STRING,
      dateTime: DataTypes.DATE,
      players: DataTypes.STRING,
      slot: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "Session",
    }
  );
  return Session;
};
