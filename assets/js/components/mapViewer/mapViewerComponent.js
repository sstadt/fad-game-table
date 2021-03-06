
var config = require('../../lib/config.js');
var util = require('../../lib/util.js');

var Service = require('../../classes/Service.js');
var MapToken = require('../../classes/MapToken.js');

var userService = require('../../services/userService.js');
var storageService = require('../../services/storageService.js');

module.exports = {
  template: require('./mapViewerTemplate.html'),
  props: {
    game: {
      type: String,
      required: true
    },
    showGmTools: {
      type: Boolean,
      defaultsTo: false
    },
    map: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      user: {},
      mapLeft: 0,
      mapTop: 0,
      mapZoom: 20, // 100% start
      lastMouseLeft: 0,
      lastMouseTop: 0,
      dragging: false,
      savingGrid: false,
      resizingGrid: false,
      gameService: undefined
    };
  },
  computed: {
    mapScale() {
      return ((this.mapZoom / 100) * 490 + 10) / 100;
    },
    mapTransform() {
      return `translateX(-50%) translateY(-50%) scale(${this.mapScale}, ${this.mapScale})`;
    },
    gridIcon() {
      return this.resizingGrid ? 'resize' : 'grid';
    },
    playerHasToken() {
      return util.getIndexById(this.map.tokens, this.user.id) > -1;
    },
    combatantIds() {
      var ids = [];

      if (this.map.tokens) {
        for (var i = 0, j = this.map.tokens.length; i < j; i++) {
          if (this.map.tokens[i].type = 'npc') {
            ids.push(this.map.tokens[i].id);
          }
        }
      }

      return ids;
    }
  },
  watch: {
    map(oldMap, newMap) {
      if (oldMap.id !== newMap.id) {
        this.setMapPositioning();
      }
    }
  },
  components: {
    mapToken: require('./mapToken/mapTokenComponent.js')
  },
  created() {
    var self = this;

    self.setMapPositioning();

    // get user data
    userService.getUserInfo()
      .then(function success(user) {
        self.user = user;
      });

    self.gameService = new Service({
      schema: config.endpoints.game,
      staticData: {
        gameId: self.game
      }
    });
  },
  methods: {
    emitError(msg) {
      this.$emit('error', msg);
    },
    getLocalMaps() {
      return storageService.getLocal(config.localStorageKeys.mapSettings, { defaultsTo: {} });
    },
    setMapPositioning() {
      var localMaps = this.getLocalMaps();

      if (!_.isUndefined(localMaps[this.map.id])) {
        this.mapLeft = localMaps[this.map.id].mapLeft || 0;
        this.mapTop = localMaps[this.map.id].mapTop || 0;
        this.mapZoom = localMaps[this.map.id].mapZoom || 20; // 100% start
      }
    },
    saveMapPositioning: _.debounce(function () {
      var localMaps = this.getLocalMaps();

      if (_.isUndefined(localMaps[this.map.id])) localMaps[this.map.id] = {};

      localMaps[this.map.id].mapLeft = this.mapLeft;
      localMaps[this.map.id].mapTop = this.mapTop;
      localMaps[this.map.id].mapZoom = this.mapZoom;

      storageService.setLocal(config.localStorageKeys.mapSettings, localMaps);
    }, 400),
    startDragging(event) {
      this.disableGhost(event);
      this.lastMouseLeft = event.clientX;
      this.lastMouseTop = event.clientY;
      this.dragging = true;
    },
    dragHandler(event) {
      var offsetX = event.clientX - this.lastMouseLeft,
        offsetY = event.clientY - this.lastMouseTop;

      if (this.dragging) {
        this.updateMapPosition(offsetX, offsetY);
        this.saveMapPositioning();
      }

      this.lastMouseLeft = event.clientX;
      this.lastMouseTop = event.clientY;
    },
    stopDragging(event) {
      var offsetX = event.clientX - this.lastMouseLeft,
        offsetY = event.clientY - this.lastMouseTop;

      this.dragging = false;
      this.updateMapPosition(offsetX, offsetY);
    },
    updateMapPosition(x, y) {
      if (x !== 0 && Math.abs(x) < 100) this.mapLeft += x;
      if (y !== 0 && Math.abs(y) < 100) this.mapTop += y;
    },
    scrollHandler(event) {
      var delta = event.deltaY / 8;

      if (this.resizingGrid) {
        this.scrollGrid(delta);
      } else {
        this.scrollMap(delta);
      }

      this.saveMapPositioning();
    },
    scrollGrid(delta) {
      this.map.baseGrid -= (delta / 100);
    },
    scrollMap(delta) {
      if (delta > 0) {
        this.mapZoom = Math.max(this.mapZoom - delta, 0);
      } else {
        this.mapZoom = Math.min(this.mapZoom - delta, 100);
      }
    },
    centerMap() {
      this.mapLeft = 0;
      this.mapTop = 0;
      this.lastMouseLeft = 0;
      this.lastMouseTop = 0;
    },
    toggleGrid() {
      var self = this,
        deferred = q.defer();

      if (self.resizingGrid === true) {
        self.savingGrid = true;
        self.gameService.updateMap({ map: { id: self.map.id, baseGrid: self.map.baseGrid } })
          .fail(function (reason) {
            self.$emit('error', reason.err);
          })
          .done(function () {
            self.savingGrid = false;
            self.resizingGrid = false;
            deferred.resolve();
          });
      } else {
        self.resizingGrid = true;
        deferred.resolve();
      }

      return deferred.promise;
    },
    addMyToken() {
      var self = this,
        deferred = q.defer(),
        mapId = self.map.id,
        tokens = [new MapToken({
          id: self.user.id,
          type: 'player',
          image: self.user.config.avatar,
          x: 0, // TODO need to calculate the best place based on other tokens
          y: 0  // TODO need to calculate the best place based on other tokens
        })];

      self.gameService.addMapToken({ mapId, tokens })
        .fail(function (reason) {
          self.$emit('error', reason.err);
        })
        .done(function () {
          deferred.resolve();
        });

      return deferred.promise;
    },
    removeMyToken() {
      var self = this,
        deferred = q.defer();

      self.gameService.removeMapToken({ mapId: self.map.id, tokenId: self.user.id })
        .fail(function (reason) {
          self.$emit('error', reason.err);
        })
        .done(function () {
          deferred.resolve();
        });

      return deferred.promise;
    },
    addCombatants(combatants) {
      var self = this,
        deferred = q.defer(),
        tokens = combatants.map(function (npc) {
          return new MapToken({
            id: npc.id,
            type: 'npc',
            image: npc.imageUrl,
            x: 0, // TODO need to calculate the best place based on other tokens
            y: 0  // TODO need to calculate the best place based on other tokens
          });
        });

      self.gameService.addMapToken({ mapId: self.map.id, tokens })
        .fail(function (reason) {
          self.$emit('error', reason.err);
        })
        .done(() => deferred.resolve());

      return deferred.promise;
    },
    clearCombatants(tokenId) {
      var self = this,
        deferred = q.defer();

      self.gameService.removeMapToken({ mapId: self.map.id, tokenId })
        .fail(function (reason) {
          self.$emit('error', reason.err);
        })
        .done(() => deferred.resolve());

      return deferred.promise;
    },
    disableGhost(event) {
      var dragImg = document.createElement("img");

      dragImg.src = 'https://s3.amazonaws.com/ssdcgametable/site_structure/transparent-pixel.png';
      event.dataTransfer.setDragImage(dragImg, 0, 0);
    }
  }
};
