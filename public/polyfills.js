// Polyfills for older browsers
(function () {
  "use strict";

  // Promise polyfill for browsers that don't support it
  if (typeof Promise === "undefined") {
    console.log("Adding Promise polyfill");
    window.Promise = function (executor) {
      var self = this;
      self.state = "pending";
      self.value = undefined;
      self.handlers = [];

      function resolve(result) {
        if (self.state === "pending") {
          self.state = "fulfilled";
          self.value = result;
          self.handlers.forEach(function (handler) {
            handler.onFulfilled(result);
          });
        }
      }

      function reject(error) {
        if (self.state === "pending") {
          self.state = "rejected";
          self.value = error;
          self.handlers.forEach(function (handler) {
            handler.onRejected(error);
          });
        }
      }

      this.then = function (onFulfilled, onRejected) {
        return new Promise(function (resolve, reject) {
          function handle() {
            if (self.state === "fulfilled") {
              if (onFulfilled) {
                try {
                  resolve(onFulfilled(self.value));
                } catch (ex) {
                  reject(ex);
                }
              } else {
                resolve(self.value);
              }
            } else if (self.state === "rejected") {
              if (onRejected) {
                try {
                  resolve(onRejected(self.value));
                } catch (ex) {
                  reject(ex);
                }
              } else {
                reject(self.value);
              }
            } else {
              self.handlers.push({
                onFulfilled: function (result) {
                  if (onFulfilled) {
                    try {
                      resolve(onFulfilled(result));
                    } catch (ex) {
                      reject(ex);
                    }
                  } else {
                    resolve(result);
                  }
                },
                onRejected: function (error) {
                  if (onRejected) {
                    try {
                      resolve(onRejected(error));
                    } catch (ex) {
                      reject(ex);
                    }
                  } else {
                    reject(error);
                  }
                },
              });
            }
          }
          handle();
        });
      };

      executor(resolve, reject);
    };
  }

  // Fetch polyfill for browsers that don't support it
  if (typeof fetch === "undefined") {
    console.log("Adding fetch polyfill");
    window.fetch = function (url, options) {
      options = options || {};
      return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open(options.method || "GET", url);

        if (options.headers) {
          Object.keys(options.headers).forEach(function (key) {
            xhr.setRequestHeader(key, options.headers[key]);
          });
        }

        xhr.onload = function () {
          resolve({
            ok: xhr.status >= 200 && xhr.status < 300,
            status: xhr.status,
            statusText: xhr.statusText,
            json: function () {
              return Promise.resolve(JSON.parse(xhr.responseText));
            },
            text: function () {
              return Promise.resolve(xhr.responseText);
            },
          });
        };

        xhr.onerror = function () {
          reject(new Error("Network error"));
        };

        xhr.send(options.body || null);
      });
    };
  }

  // Object.assign polyfill
  if (typeof Object.assign !== "function") {
    console.log("Adding Object.assign polyfill");
    Object.assign = function (target, varArgs) {
      if (target == null) {
        throw new TypeError("Cannot convert undefined or null to object");
      }
      var to = Object(target);
      for (var index = 1; index < arguments.length; index++) {
        var nextSource = arguments[index];
        if (nextSource != null) {
          for (var nextKey in nextSource) {
            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
              to[nextKey] = nextSource[nextKey];
            }
          }
        }
      }
      return to;
    };
  }

  console.log("Polyfills loaded successfully");
})();
