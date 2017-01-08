
var gameService = require('../../services/gameService.js');
var config = require('../../lib/config.js');

module.exports = {
  template: require('./chatTemplate.html'),
  props: {
    game: {
      type: String,
      required: true
    },
    log: {
      type: Array,
      required: true
    }
  },
  data() {
    return {
      chatMessage: '',
      isScrolledToBottom: true
    };
  },
  created() {
    this.scrollChatToBottom();
  },
  watch: {
    log() {
      this.scrollChatToBottom();
    }
  },
  components: {
    taskRoll: require('./taskRoll/taskRollComponent.js'),
    standardRoll: require('./standardRoll/standardRollComponent.js')
  },
  methods: {
    rollType(message) {
      return `${message.type}Roll`;
    },
    addRollByDrag() {
      var type = event.dataTransfer.getData("text");

      if (_.includes(config.dieTypes, type)) {
        this.rollTaskDie(type);
      } else if (type === 'percent') {
        this.rollStandardDie(100);
      }
    },
    rollStandardDie(sides) {
      var self = this,
        deferred = q.defer(),
        dicePool = { sides };

      gameService.sendRoll(self.game, dicePool, 'rolled a die')
        .fail(function (reason) {
          self.$emit('error', reason);
        })
        .done(function () {
          deferred.resolve();
        });

      return deferred.promise;
    },
    rollTaskDie(type) {
      var self = this,
        deferred = q.defer(),
        dicePool = {};

      dicePool[type] = 1;

      gameService.sendRoll(self.game, dicePool, 'rolled a task die')
        .fail(function (reason) {
          self.$emit('error', reason);
        })
        .done(function () {
          deferred.resolve();
        });

      return deferred.promise;
    },
    sendChatMessage() {
      var self = this,
        deferred = q.defer();

      if (self.chatMessage.length > 0) {
        gameService.sendMessage(self.game, self.chatMessage)
          .then(function success() {
            self.chatMessage = '';
          }, function error(reason) {
            self.$emit('error', reason);
          })
          .done(function () {
            deferred.resolve();
          });
      } else {
        deferred.resolve();
      }

      return deferred.promise;
    },
    playCrawl(crawl) {
      this.$emit('play-crawl', crawl);
    },
    scrollChatToBottom() {
      var self = this;

      if (this.isScrolledToBottom) {
        Vue.nextTick(function () {
          self.$refs.chatLog.scrollTop = self.$refs.chatLog.scrollHeight - self.$refs.chatLog.offsetHeight;
        });
      }
    },
    userScrolling(event) {
      var scrollPos = this.$refs.chatLog.offsetHeight + this.$refs.chatLog.scrollTop;
      this.isScrolledToBottom = Math.abs(this.$refs.chatLog.scrollHeight - scrollPos) <= 10;
    }
  }
};
