// Generated by CoffeeScript 1.3.3

define('specs/hoodie/remote', ['hoodie/remote', 'mocks/hoodie', 'mocks/changes_response', 'mocks/changed_docs', 'mocks/bulk_update_response'], function(Remote, HoodieMock, ChangesResponseMock, ChangedDocsMock, BulkUpdateResponseMock) {
  return describe("Remote", function() {
    beforeEach(function() {
      this.hoodie = new HoodieMock;
      this.remote = new Remote(this.hoodie);
      spyOn(this.hoodie, "on");
      spyOn(this.hoodie, "one");
      spyOn(this.hoodie, "unbind");
      spyOn(this.hoodie, "request").andReturn({
        then: jasmine.createSpy('then')
      });
      spyOn(window, "setTimeout");
      spyOn(this.hoodie, "trigger");
      spyOn(this.hoodie.store, "destroy").andReturn({
        then: function(cb) {
          return cb('object_from_store');
        }
      });
      return spyOn(this.hoodie.store, "save").andReturn({
        then: function(cb) {
          return cb('object_from_store', false);
        }
      });
    });
    describe(".constructor(@hoodie, options = {})", function() {
      beforeEach(function() {
        spyOn(Remote.prototype, "connect");
        return this.remote = new Remote(this.hoodie);
      });
      it("should be active by default", function() {
        return expect(this.remote.active).toBeTruthy();
      });
      it("should connect", function() {
        return expect(Remote.prototype.connect).wasCalled();
      });
      return _when("config remote.active is false", function() {
        beforeEach(function() {
          spyOn(this.hoodie.config, "get").andReturn(false);
          return this.remote = new Remote(this.hoodie);
        });
        return it("should set active to false", function() {
          return expect(this.remote.active).toBeFalsy();
        });
      });
    });
    describe(".connect()", function() {
      beforeEach(function() {
        return spyOn(this.remote, "sync");
      });
      it("should set remote.active to true", function() {
        this.remote.active = false;
        this.remote.connect();
        return expect(this.remote.active).toBeTruthy();
      });
      it("should set config remote.active to true", function() {
        spyOn(this.hoodie.config, "set");
        this.remote.connect();
        return expect(this.hoodie.config.set).wasCalledWith('_remote.active', true);
      });
      it("should subscribe to `signed_out` event", function() {
        this.remote.connect();
        return expect(this.hoodie.on).wasCalledWith('account:signed_out', this.remote.disconnect);
      });
      it("should authenticate", function() {
        spyOn(this.hoodie.account, "authenticate").andCallThrough();
        this.remote.connect();
        return expect(this.hoodie.account.authenticate).wasCalled();
      });
      _when("successful", function() {
        beforeEach(function() {
          return spyOn(this.hoodie.account, "authenticate").andReturn({
            pipe: function(cb) {
              cb();
              return {
                fail: function() {}
              };
            }
          });
        });
        return it("should sync", function() {
          this.remote.connect();
          return expect(this.remote.sync).wasCalled();
        });
      });
      return _when("not successful", function() {
        beforeEach(function() {
          return spyOn(this.hoodie.account, "authenticate").andReturn({
            pipe: function() {
              return {
                fail: function(cb) {
                  return cb();
                }
              };
            }
          });
        });
        return it("should subscribe to account:sign_in with sync", function() {
          this.remote.connect();
          return expect(this.hoodie.on).wasCalledWith('account:signed_in', this.remote.sync);
        });
      });
    });
    describe(".disconnect()", function() {
      it("should set remote.active to false", function() {
        this.remote.active = true;
        this.remote.disconnect();
        return expect(this.remote.active).toBeFalsy();
      });
      it("should set config remote.active to true", function() {
        spyOn(this.hoodie.config, "set");
        this.remote.disconnect();
        return expect(this.hoodie.config.set).wasCalledWith('_remote.active', false);
      });
      it("should abort the pull request", function() {
        this.remote._pull_request = {
          abort: jasmine.createSpy('pull')
        };
        this.remote.disconnect();
        return expect(this.remote._pull_request.abort).wasCalled();
      });
      it("should abort the push request", function() {
        this.remote._push_request = {
          abort: jasmine.createSpy('push')
        };
        this.remote.disconnect();
        return expect(this.remote._push_request.abort).wasCalled();
      });
      it("should unsubscribe from stores's dirty idle event", function() {
        this.remote.disconnect();
        return expect(this.hoodie.unbind).wasCalledWith('store:dirty:idle', this.remote.push);
      });
      it("should unsubscribe from account's signed_in idle event", function() {
        this.remote.disconnect();
        return expect(this.hoodie.unbind).wasCalledWith('account:signed_in', this.remote.connect);
      });
      return it("should unsubscribe from account's signed_out idle event", function() {
        this.remote.disconnect();
        return expect(this.hoodie.unbind).wasCalledWith('account:signed_out', this.remote.disconnect);
      });
    });
    describe(".pull()", function() {
      _when("remote is active", function() {
        beforeEach(function() {
          return this.remote.active = true;
        });
        it("should send a longpoll GET request to user's db _changes feed", function() {
          var method, path, _ref;
          spyOn(this.hoodie.account, "db").andReturn('joe$examle_com');
          this.remote.pull();
          expect(this.hoodie.request).wasCalled();
          _ref = this.hoodie.request.mostRecentCall.args, method = _ref[0], path = _ref[1];
          expect(method).toBe('GET');
          return expect(path).toBe('/joe%24examle_com/_changes?include_docs=true&heartbeat=10000&feed=longpoll&since=0');
        });
        return it("should set a timeout to restart the pull request", function() {
          this.remote.pull();
          return expect(window.setTimeout).wasCalledWith(this.remote._restart_pull_request, 25000);
        });
      });
      _when("remote is not active", function() {
        beforeEach(function() {
          return this.remote.active = false;
        });
        return it("should send a normal GET request to user's db _changes feed", function() {
          var method, path, _ref;
          spyOn(this.hoodie.account, "db").andReturn('joe$examle_com');
          this.remote.pull();
          expect(this.hoodie.request).wasCalled();
          _ref = this.hoodie.request.mostRecentCall.args, method = _ref[0], path = _ref[1];
          expect(method).toBe('GET');
          return expect(path).toBe('/joe%24examle_com/_changes?include_docs=true&since=0');
        });
      });
      _when("request is successful / returns changes", function() {
        beforeEach(function() {
          var _this = this;
          return this.hoodie.request.andReturn({
            then: function(success) {
              _this.hoodie.request.andReturn({
                then: function() {}
              });
              return success(ChangesResponseMock());
            }
          });
        });
        it("should remove `todo/abc3` from store", function() {
          this.remote.pull();
          return expect(this.hoodie.store.destroy).wasCalledWith('todo', 'abc3', {
            remote: true
          });
        });
        it("should save `todo/abc2` in store", function() {
          this.remote.pull();
          return expect(this.hoodie.store.save).wasCalledWith('todo', 'abc2', {
            _rev: '1-123',
            content: 'remember the milk',
            done: false,
            order: 1,
            type: 'todo',
            id: 'abc2'
          }, {
            remote: true
          });
        });
        it("should trigger remote events", function() {
          this.remote.pull();
          expect(this.hoodie.trigger).wasCalledWith('remote:destroyed', 'todo', 'abc3', 'object_from_store');
          expect(this.hoodie.trigger).wasCalledWith('remote:destroyed:todo', 'abc3', 'object_from_store');
          expect(this.hoodie.trigger).wasCalledWith('remote:destroyed:todo:abc3', 'object_from_store');
          expect(this.hoodie.trigger).wasCalledWith('remote:changed', 'destroyed', 'todo', 'abc3', 'object_from_store');
          expect(this.hoodie.trigger).wasCalledWith('remote:changed:todo', 'destroyed', 'abc3', 'object_from_store');
          expect(this.hoodie.trigger).wasCalledWith('remote:changed:todo:abc3', 'destroyed', 'object_from_store');
          expect(this.hoodie.trigger).wasCalledWith('remote:updated', 'todo', 'abc2', 'object_from_store');
          expect(this.hoodie.trigger).wasCalledWith('remote:updated:todo', 'abc2', 'object_from_store');
          expect(this.hoodie.trigger).wasCalledWith('remote:updated:todo:abc2', 'object_from_store');
          expect(this.hoodie.trigger).wasCalledWith('remote:changed', 'updated', 'todo', 'abc2', 'object_from_store');
          expect(this.hoodie.trigger).wasCalledWith('remote:changed:todo', 'updated', 'abc2', 'object_from_store');
          return expect(this.hoodie.trigger).wasCalledWith('remote:changed:todo:abc2', 'updated', 'object_from_store');
        });
        return _and("remote is active", function() {
          beforeEach(function() {
            this.remote.active = true;
            return spyOn(this.remote, "pull").andCallThrough();
          });
          return it("should pull again", function() {
            this.remote.pull();
            return expect(this.remote.pull.callCount).toBe(2);
          });
        });
      });
      _when("request errors with 403 unauthorzied", function() {
        beforeEach(function() {
          var _this = this;
          this.hoodie.request.andReturn({
            then: function(success, error) {
              _this.hoodie.request.andReturn({
                then: function() {}
              });
              return error({
                status: 403
              }, 'error object');
            }
          });
          return spyOn(this.remote, "disconnect");
        });
        it("should disconnect", function() {
          this.remote.pull();
          return expect(this.remote.disconnect).wasCalled();
        });
        it("should trigger an unauthenticated error", function() {
          this.remote.pull();
          return expect(this.hoodie.trigger).wasCalledWith('remote:error:unauthenticated', 'error object');
        });
        _and("remote is active", function() {
          beforeEach(function() {
            return this.remote.active = true;
          });
          return it("should reconnect when reauthenticated", function() {
            this.remote.pull();
            return expect(this.hoodie.one).wasCalledWith('account:signed_in', this.remote.connect);
          });
        });
        return _and("remote isn't active", function() {
          beforeEach(function() {
            return this.remote.active = false;
          });
          return it("should not reconnect when reauthenticated", function() {
            this.remote.pull();
            return expect(this.hoodie.one).wasNotCalledWith('account:signed_in', this.remote.connect);
          });
        });
      });
      _when("request errors with 404 not found", function() {
        beforeEach(function() {
          var _this = this;
          return this.hoodie.request.andReturn({
            then: function(success, error) {
              _this.hoodie.request.andReturn({
                then: function() {}
              });
              return error({
                status: 404
              }, 'error object');
            }
          });
        });
        return it("should try again in 3 seconds (it migh be due to a sign up, the userDB might be created yet)", function() {
          this.remote.pull();
          return expect(window.setTimeout).wasCalledWith(this.remote.pull, 3000);
        });
      });
      _when("request errors with 500 oooops", function() {
        beforeEach(function() {
          var _this = this;
          return this.hoodie.request.andReturn({
            then: function(success, error) {
              _this.hoodie.request.andReturn({
                then: function() {}
              });
              return error({
                status: 500
              }, 'error object');
            }
          });
        });
        it("should try again in 3 seconds (and hope it was only a hiccup ...)", function() {
          this.remote.pull();
          return expect(window.setTimeout).wasCalledWith(this.remote.pull, 3000);
        });
        return it("should trigger a server error event", function() {
          this.remote.pull();
          return expect(this.hoodie.trigger).wasCalledWith('remote:error:server', 'error object');
        });
      });
      _when("request was aborted manually", function() {
        beforeEach(function() {
          var _this = this;
          return this.hoodie.request.andReturn({
            then: function(success, error) {
              _this.hoodie.request.andReturn({
                then: function() {}
              });
              return error({
                statusText: 'abort'
              }, 'error object');
            }
          });
        });
        return it("should try again when remote is active", function() {
          spyOn(this.remote, "pull").andCallThrough();
          this.remote.active = true;
          this.remote.pull();
          expect(this.remote.pull.callCount).toBe(2);
          this.remote.pull.reset();
          this.remote.active = false;
          this.remote.pull();
          return expect(this.remote.pull.callCount).toBe(1);
        });
      });
      return _when("there is a different error", function() {
        beforeEach(function() {
          var _this = this;
          return this.hoodie.request.andReturn({
            then: function(success, error) {
              _this.hoodie.request.andReturn({
                then: function() {}
              });
              return error({}, 'error object');
            }
          });
        });
        return it("should try again in 3 seconds if remote is active", function() {
          this.remote.active = true;
          this.remote.pull();
          expect(window.setTimeout).wasCalledWith(this.remote.pull, 3000);
          window.setTimeout.reset();
          this.remote.active = false;
          this.remote.pull();
          return expect(window.setTimeout).wasNotCalledWith(this.remote.pull, 3000);
        });
      });
    });
    describe(".push(docs)", function() {
      return _when("no docs passed", function() {
        _and("there are no changed docs", function() {
          beforeEach(function() {
            spyOn(this.hoodie.store, "changed_docs").andReturn([]);
            return this.remote.push();
          });
          return it("shouldn't do anything", function() {
            return expect(this.hoodie.request).wasNotCalled();
          });
        });
        _and("there is one deleted and one changed doc", function() {
          beforeEach(function() {
            var _ref;
            spyOn(this.hoodie.store, "changed_docs").andReturn(ChangedDocsMock());
            spyOn(this.hoodie.account, "db").andReturn('joe$examle_com');
            this.remote.push();
            expect(this.hoodie.request).wasCalled();
            return _ref = this.hoodie.request.mostRecentCall.args, this.method = _ref[0], this.path = _ref[1], this.options = _ref[2], _ref;
          });
          it("should post the changes to the user's db _bulk_docs API", function() {
            expect(this.method).toBe('POST');
            return expect(this.path).toBe('/joe%24examle_com/_bulk_docs');
          });
          it("should set dataType to json", function() {
            return expect(this.options.dataType).toBe('json');
          });
          it("should set processData to false", function() {
            return expect(this.options.processData).toBe(false);
          });
          it("should set contentType to 'application/json'", function() {
            return expect(this.options.contentType).toBe('application/json');
          });
          it("should send the docs in appropriate format", function() {
            var doc, docs;
            docs = JSON.parse(this.options.data).docs;
            doc = docs[0];
            expect(doc.id).toBeUndefined();
            expect(doc._id).toBe('todo/abc3');
            return expect(doc._localInfo).toBeUndefined();
          });
          return _and("the request is successful, but with one conflict error", function() {
            beforeEach(function() {
              var _this = this;
              this.hoodie.request.andCallFake(function(method, path, options) {
                return options.success(BulkUpdateResponseMock());
              });
              return this.remote.push();
            });
            return it("should trigger conflict event", function() {
              return expect(this.hoodie.trigger).wasCalledWith('remote:error:conflict', 'todo/abc2');
            });
          });
        });
        return _when("Array of docs passed", function() {
          beforeEach(function() {
            this.todo_objects = [
              {
                type: 'todo',
                id: '1'
              }, {
                type: 'todo',
                id: '2'
              }, {
                type: 'todo',
                id: '3'
              }
            ];
            return this.remote.push(this.todo_objects);
          });
          return it("should POST the passed objects", function() {
            var data;
            expect(this.hoodie.request).wasCalled();
            data = JSON.parse(this.hoodie.request.mostRecentCall.args[2].data);
            return expect(data.docs.length).toBe(3);
          });
        });
      });
    });
    describe(".sync(docs)", function() {
      beforeEach(function() {
        spyOn(this.remote, "push");
        return spyOn(this.remote, "pull");
      });
      it("should push changes and pass arguments", function() {
        this.remote.sync([1, 2, 3]);
        return expect(this.remote.push).wasCalledWith([1, 2, 3]);
      });
      it("should pull changes and pass arguments", function() {
        this.remote.sync([1, 2, 3]);
        return expect(this.remote.pull).wasCalledWith([1, 2, 3]);
      });
      return _when("remote is active", function() {
        beforeEach(function() {
          return this.remote.active = true;
        });
        it("should bind to store:dirty:idle event", function() {
          this.remote.sync();
          return expect(this.hoodie.on).wasCalledWith('store:dirty:idle', this.remote.push);
        });
        return it("should unbind from store:dirty:idle event before it binds to it", function() {
          var order;
          order = [];
          this.hoodie.unbind.andCallFake(function(event) {
            return order.push("unbind " + event);
          });
          this.hoodie.on.andCallFake(function(event) {
            return order.push("bind " + event);
          });
          this.remote.sync();
          expect(order[0]).toBe('unbind store:dirty:idle');
          return expect(order[1]).toBe('bind store:dirty:idle');
        });
      });
    });
    return describe(".on(event, callback)", function() {
      return it("should namespace events with `remote`", function() {
        var cb;
        cb = jasmine.createSpy('test');
        this.remote.on('funky', cb);
        return expect(this.hoodie.on).wasCalledWith('remote:funky', cb);
      });
    });
  });
});
