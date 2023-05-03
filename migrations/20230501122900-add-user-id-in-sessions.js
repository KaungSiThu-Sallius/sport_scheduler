"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.addColumn("Sessions", "userId", {
      type: Sequelize.DataTypes.INTEGER,
    });
    await queryInterface.addColumn("Sessions", "sportId", {
      type: Sequelize.DataTypes.INTEGER,
    });
    // await queryInterface.addConstraint("Sessions", {
    //   fields: ["userId"],
    //   type: "foreign key",
    //   references: {
    //     table: "Users",
    //     field: "id",
    //   },
    // });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Sessions", "userId");
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  },
};
