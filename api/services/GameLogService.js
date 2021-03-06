
var q = require('q'),
  gameErrors = sails.config.notifications.Game.general.error;

function LogMessage(data) {
  this.type = data.type;
  this.chatHandle = data.chatHandle;
  this.timeStamp = new Date();
  this.message = data.message;
}

function addLogMessage(gameId, type, chatHandle, message) {
  var deferred = q.defer(),
    newMessage = new LogMessage({
      type: type,
      chatHandle: chatHandle,
      message: message
    });

  GameLog.findOne({ game: gameId }, function (err, log) {
    if (err) {
      deferred.reject(err);
    } else if (log === undefined) {
      deferred.reject(gameErrors.logNotFound);
    } else {
      log.log.push(newMessage);
      log.save(function (err) {
        if (err) {
          deferred.reject(err);
        } else {
          deferred.resolve(newMessage);
        }
      });
    }
  });

  return deferred.promise;
}

function sendLogMessage(gameId, message) {
  Game.message(gameId, {
    type: 'newLogMessage',
    game: gameId,
    data: message
  });
}

module.exports = {

  getLog: function (gameId) {
    var deferred = q.defer();

    GameLog.findOne({ game: gameId }, function (err, log) {
      if (err) {
        deferred.reject(err);
      } else if (log) {
        deferred.resolve(log);
      } else {
        GameLog.create({ game: gameId }, function (err, log) {
          if (err) {
            deferred.reject(err);
          } else {
            deferred.resolve(log);
          }
        });
      }
    });

    return deferred.promise;
  },

  addChatMessage: function (gameId, chatHandle, chatMessage) {
    var deferred = q.defer();

    addLogMessage(gameId, 'chat', chatHandle, chatMessage)
      .then(function success(message) {
        sendLogMessage(gameId, message);
        deferred.resolve();
      }, function error(err) {
        sails.log(err);
        deferred.reject(err);
      });

    return deferred.promise;
  },

  addStatusMessage: function (gameId, chatHandle, chatMessage) {
    var deferred = q.defer();

    addLogMessage(gameId, 'status', chatHandle, chatMessage)
      .then(function success(message) {
        sendLogMessage(gameId, message);
        deferred.resolve();
      }, function error(err) {
        sails.log(err);
        deferred.reject(err);
      });

    return deferred.promise;
  },

  addRollMessage: function (gameId, chatHandle, description, pool) {
    var deferred = q.defer();

    addLogMessage(gameId, 'roll', chatHandle, DicePoolService.roll(description, pool))
      .then(function success(message) {
        sendLogMessage(gameId, message);
        deferred.resolve(message);
      }, function error(err) {
        sails.log(err);
        deferred.reject(err);
      });

    return deferred.promise;
  },

  addCrawlMessage: function (gameId, chatHandle, crawl) {
    var deferred = q.defer();

    addLogMessage(gameId, 'crawl', chatHandle, crawl)
      .then(function success(message) {
        sendLogMessage(gameId, message);
        deferred.resolve();
      }, function error(err) {
        sails.log(err);
        deferred.reject(err);
      });

    return deferred.promise;
  }

};
