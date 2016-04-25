/**
 * DevController
 *
 * @description :: Server-side logic for managing Devs
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

  sandbox: function (req, res) {
    res.view({
      title: sails.config.globals.pageTitle.sandbox,
      script: 'sandbox'
    });
  },

  components: function (req, res) {
    res.view({
      title: sails.config.globals.pageTitle.components,
      script: 'components'
    });
  }
};
