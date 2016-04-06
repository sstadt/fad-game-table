
var constants = require('../../config/constants.js');
var userService = require('../../services/userService.js');
var gameService = require('../../services/gameService.js');

require('./crawlMenu/crawlMenu.js');
require('./playersMenu/playersMenu.js');
require('./settingsMenu/settingsMenu.js');
require('../starWarsCrawl/starWarsCrawl.js');

function getPlayerIndex(list, id) {
  return _.findIndex(list, function (player) {
    return player.id === id;
  });
}

var playerSocketHandler = {
  playerRequestedJoin: function (game, data) {
    game.requestingPlayers.push(data.player);
  },
  playerJoinApproved: function (game, data) {
    var playerIndex = getPlayerIndex(game.requestingPlayers, data.player.id);

    if (playerIndex > -1) {
      game.requestingPlayers.$remove(game.requestingPlayers[playerIndex]);
    }

    game.players.push(data.player);
  },
  playerJoinDeclined: function (game, data) {
    var playerIndex = getPlayerIndex(game.requestingPlayers, data.player.id);

    if (playerIndex > -1) {
      game.requestingPlayers.$remove(game.requestingPlayers[playerIndex]);
    }
  },
  playerRemoved: function (game, data, user) {
    var playerIndex = getPlayerIndex(game.players, data.player.id);

    if (playerIndex > -1) {
      game.players.$remove(game.players[playerIndex]);
    }

    if (data.player.id === user.id) {
      window.location.href = '/home';
    }
  }
};

function playerSocketMessageIsValid(message) {
  return message.data.game && message.data.type && message.data.data;
}

module.exports = {
  template: require('./gameTemplate.html'),
  props: {
    gameId: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      // user data
      user: {},

      // game data
      game: {},
      gameLog: [],

      // interface pieces
      gameAlert: {},
      crawlModalOpen: false,
      playersModalOpen: false,
      settingsModalOpen: false,
      navigationOpen: false,
      confirmLogout: false,

      // crawl data
      selectedCrawlId: '',
      crawlTitle: '',
      crawlSubtitle: '',
      crawlCrawl: '',
      crawlImage: '',
      showCrawl: false
    };
  },
  ready() {
    var self = this;

    // listen for game updates
    io.socket.on('game', function (message) {
      if (playerSocketMessageIsValid(message) && self.game.id === message.data.game && playerSocketHandler.hasOwnProperty(message.data.type)) {
        playerSocketHandler[message.data.type](self.game, message.data.data, self.user);
      }
    });

    // get user data
    userService.getUserInfo()
      .then(function success(user) {
        self.user = user;
      });

    // get game data
    gameService.get(self.gameId)
      .then(function success(game) {
        self.game = game;
        self.initCrawlOptions();
      }, function error(reason) {
        return q.reject(reason);
      }).then(function () {
        return gameService.getLog(self.gameId);
      }).then(function success(log) {
        self.gameLog = log;
      }, function error(reason) {
        self.gameAlert.error(reason);
      });
  },
  computed: {
    userIsGameMaster() {
      return this.game.gameMaster && this.game.gameMaster.id === this.user.id;
    },
    crawlOptions() {
      var self = this,
        crawlOptions = [];

      if (self.game && self.game.crawls) {
        _.forEach(self.game.crawls, function (crawl) {
          if (crawl.published) {
            crawlOptions.push({
              value: crawl.id,
              label: crawl.title
            });
          }
        });
      }

      return crawlOptions;
    },
    selectedCrawl() {
      var self = this,
        index = _.findIndex(self.game.crawls, function (crawl) {
          return crawl.id === self.selectedCrawlId;
        });

      return index > -1 ? self.game.crawls[index] : null;
    }
  },
  partials: {
    'players-pane': require('./partials/playersPane.html'),
    'crawl-pane': require('./partials/crawlPane.html'),
    'chat-pane': require('./partials/chatPane.html')
  },
  events: {
    [constants.events.game.closeCrawl]() {
      this.crawlModalOpen = false;
    },
    [constants.events.game.closePlayers]() {
      this.playersModalOpen = false;
    },
    [constants.events.game.closeSettings]() {
      this.settingsModalOpen = false;
    }
  },
  methods: {
    initCrawlOptions() {
      var self = this,
        crawlTimestamp = 0,
        crawlId,
        nextTimestamp;

      if (self.game.crawls.length > 0) {
        _.forEach(self.game.crawls, function (crawl) {
          nextTimestamp = moment(crawl.createdAt).valueOf();
          if (crawl.published && (!crawlId || nextTimestamp > crawlTimestamp)) {
            crawlId = crawl.id;
            crawlTimestamp = nextTimestamp;
          }
        });
      }

      if (crawlId) {
        self.selectedCrawlId = crawlId;
      }
    },
    playCrawl(crawl) {
      this.crawlTitle = crawl.title;
      this.crawlSubtitle = crawl.subtitle;
      this.crawlCrawl = crawl.crawl;
      this.crawlImage = crawl.imageUrl;
      this.showCrawl = true;
    }
  }
};
