'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('conversations', 'isGroup', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Indica si es un grupo de WhatsApp'
    });

    await queryInterface.addColumn('conversations', 'groupDescription', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Descripción del grupo (solo para grupos)'
    });

    await queryInterface.addColumn('conversations', 'groupParticipants', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'Lista de participantes del grupo (solo para grupos)'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('conversations', 'isGroup');
    await queryInterface.removeColumn('conversations', 'groupDescription');
    await queryInterface.removeColumn('conversations', 'groupParticipants');
  }
};
