"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class CancelSession extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }

    static async remove(sessionId) {
      return this.destroy({
        where: {
          sessionId,
        },
      });
    }

    static async _isCancel(sessionId) {
      return this.findOne({
        where: {
          sessionId,
        },
      });
    }
  }
  CancelSession.init(
    {
      sessionId: DataTypes.INTEGER,
      reason: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "CancelSession",
    }
  );
  return CancelSession;
};
