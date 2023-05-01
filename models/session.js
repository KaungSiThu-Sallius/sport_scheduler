"use strict";
const { Model, Op } = require("sequelize");
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

    static addSession({ place, dateTime, players, slot, sportId, userId }) {
      return this.create({ place, dateTime, players, slot, sportId, userId });
    }

    static getSessionDetail(sportId) {
      return this.findAll({
        where: {
          sportId,
          dateTime: {
            [Op.gt]: new Date(),
          },
        },
      });
    }

    static getSpecificSession(id) {
      return this.findByPk(id);
    }

    static updatePlayer(id, players) {
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
