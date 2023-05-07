"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }

    static addUser({ name, email, pwd, isAdmin }) {
      return this.create({
        name: name,
        email: email,
        password: pwd,
        isAdmin: isAdmin,
      });
    }

    static async getName(id) {
      return this.findByPk(id);
    }

    static async isEmailExist(email) {
      return this.findAll({
        where: {
          email,
        },
      });
    }
  }
  User.init(
    {
      name: DataTypes.STRING,
      email: DataTypes.STRING,
      password: DataTypes.STRING,
      isAdmin: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: "User",
    }
  );
  return User;
};
