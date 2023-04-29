"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Sport extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Sport.hasMany(models.Session, {
        foreignKey: "sportId",
      });
    }

    static addSport({ name }) {
      return this.create({ name: name });
    }

    static async getSportName() {
      return this.findAll();
    }

    static async specificSport(id) {
      return this.findByPk(id);
    }

    static async editSport(name, id) {
      return this.update(
        { name: name },
        {
          where: {
            id: id,
          },
        }
      );
    }

    static async remove(id) {
      return this.destroy({
        where: {
          id,
        },
      });
    }
  }
  Sport.init(
    {
      name: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Sport",
    }
  );
  return Sport;
};
