'use strict';

var Transform = require('stream').Transform,
    inherits = require('util').inherits;

var clarinet = require('clarinet');

var Deque = require('double-ended-queue');

module.exports = JsonLoader;

function JsonLoader() {
    Transform.call(this);
    
    this._readableState.objectMode = true;
    
    this.parser = this.initParser();
    
    this.keys = new Deque(10);
    this.vals = new Deque(10);
}
inherits(JsonLoader, Transform);

JsonLoader.prototype._transform = function (chunk, encoding, callback) {
    this.parser.write(chunk.toString());
    callback();
};
JsonLoader.prototype._flush = function (callback) {
    this.parser.close();
    this._end();
    callback();
};

JsonLoader.prototype._onerror = function (e) {
    this.emit('error', e);
    this._end();
};
JsonLoader.prototype._onvalue = function (v) {
    if (this.vals.length === 0) {
        this.push(v);
        this.keys.clear();
        this.vals.clear();
    } else {
        var parent = this.vals.peekBack();
        if (Array.isArray(parent)) {
            parent.push(v);
        } else {
            parent[this.keys.pop()] = v;
        }
    }
};
JsonLoader.prototype._onopenobject = function (key) {
    this.vals.push({ });
    this.keys.push(key);
};
JsonLoader.prototype._onkey = function (key) {
    this.keys.push(key);
};
JsonLoader.prototype._onopenarray = function () {
    this.vals.push([ ]);
};

JsonLoader.prototype._oncloseobject =
JsonLoader.prototype._onclosearray = function () {
    this._onvalue(this.vals.pop());
};

JsonLoader.prototype._onend = function () {
    var val = this.value;
    this._end();
};
JsonLoader.prototype._end = function () {
    this.keys = null;
    this.vals = null;
    this.ended = true;
    this.push(null);
};
JsonLoader.prototype.initParser = function () {
    var parser = clarinet.parser();
    parser.onerror = this._onerror.bind(this);
    parser.onvalue = this._onvalue.bind(this);
    parser.onopenobject = this._onopenobject.bind(this);
    parser.onkey = this._onkey.bind(this);
    parser.oncloseobject = this._oncloseobject.bind(this);
    parser.onopenarray = this._onopenarray.bind(this);
    parser.onclosearray = this._onclosearray.bind(this);
    parser.onend = this._onend.bind(this);
    return parser;
};
