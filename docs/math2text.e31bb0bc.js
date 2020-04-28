// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles
parcelRequire = (function (modules, cache, entry, globalName) {
  // Save the require from previous bundle to this closure if any
  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
  var nodeRequire = typeof require === 'function' && require;

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error('Cannot find module \'' + name + '\'');
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = cache[name] = new newRequire.Module(name);

      modules[name][0].call(module.exports, localRequire, module, module.exports, this);
    }

    return cache[name].exports;

    function localRequire(x){
      return newRequire(localRequire.resolve(x));
    }

    function resolve(x){
      return modules[name][1][x] || x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports;
    }, {}];
  };

  var error;
  for (var i = 0; i < entry.length; i++) {
    try {
      newRequire(entry[i]);
    } catch (e) {
      // Save first error but execute all entries
      if (!error) {
        error = e;
      }
    }
  }

  if (entry.length) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(entry[entry.length - 1]);

    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = mainExports;

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
     define(function () {
       return mainExports;
     });

    // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }

  // Override the current require with this new one
  parcelRequire = newRequire;

  if (error) {
    // throw error from earlier, _after updating parcelRequire_
    throw error;
  }

  return newRequire;
})({"node_modules/nearley/lib/nearley.js":[function(require,module,exports) {
(function(root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.nearley = factory();
    }
}(this, function() {

    function Rule(name, symbols, postprocess) {
        this.id = ++Rule.highestId;
        this.name = name;
        this.symbols = symbols;        // a list of literal | regex class | nonterminal
        this.postprocess = postprocess;
        return this;
    }
    Rule.highestId = 0;

    Rule.prototype.toString = function(withCursorAt) {
        function stringifySymbolSequence (e) {
            return e.literal ? JSON.stringify(e.literal) :
                   e.type ? '%' + e.type : e.toString();
        }
        var symbolSequence = (typeof withCursorAt === "undefined")
                             ? this.symbols.map(stringifySymbolSequence).join(' ')
                             : (   this.symbols.slice(0, withCursorAt).map(stringifySymbolSequence).join(' ')
                                 + " ● "
                                 + this.symbols.slice(withCursorAt).map(stringifySymbolSequence).join(' ')     );
        return this.name + " → " + symbolSequence;
    }


    // a State is a rule at a position from a given starting point in the input stream (reference)
    function State(rule, dot, reference, wantedBy) {
        this.rule = rule;
        this.dot = dot;
        this.reference = reference;
        this.data = [];
        this.wantedBy = wantedBy;
        this.isComplete = this.dot === rule.symbols.length;
    }

    State.prototype.toString = function() {
        return "{" + this.rule.toString(this.dot) + "}, from: " + (this.reference || 0);
    };

    State.prototype.nextState = function(child) {
        var state = new State(this.rule, this.dot + 1, this.reference, this.wantedBy);
        state.left = this;
        state.right = child;
        if (state.isComplete) {
            state.data = state.build();
            // Having right set here will prevent the right state and its children
            // form being garbage collected
            state.right = undefined;
        }
        return state;
    };

    State.prototype.build = function() {
        var children = [];
        var node = this;
        do {
            children.push(node.right.data);
            node = node.left;
        } while (node.left);
        children.reverse();
        return children;
    };

    State.prototype.finish = function() {
        if (this.rule.postprocess) {
            this.data = this.rule.postprocess(this.data, this.reference, Parser.fail);
        }
    };


    function Column(grammar, index) {
        this.grammar = grammar;
        this.index = index;
        this.states = [];
        this.wants = {}; // states indexed by the non-terminal they expect
        this.scannable = []; // list of states that expect a token
        this.completed = {}; // states that are nullable
    }


    Column.prototype.process = function(nextColumn) {
        var states = this.states;
        var wants = this.wants;
        var completed = this.completed;

        for (var w = 0; w < states.length; w++) { // nb. we push() during iteration
            var state = states[w];

            if (state.isComplete) {
                state.finish();
                if (state.data !== Parser.fail) {
                    // complete
                    var wantedBy = state.wantedBy;
                    for (var i = wantedBy.length; i--; ) { // this line is hot
                        var left = wantedBy[i];
                        this.complete(left, state);
                    }

                    // special-case nullables
                    if (state.reference === this.index) {
                        // make sure future predictors of this rule get completed.
                        var exp = state.rule.name;
                        (this.completed[exp] = this.completed[exp] || []).push(state);
                    }
                }

            } else {
                // queue scannable states
                var exp = state.rule.symbols[state.dot];
                if (typeof exp !== 'string') {
                    this.scannable.push(state);
                    continue;
                }

                // predict
                if (wants[exp]) {
                    wants[exp].push(state);

                    if (completed.hasOwnProperty(exp)) {
                        var nulls = completed[exp];
                        for (var i = 0; i < nulls.length; i++) {
                            var right = nulls[i];
                            this.complete(state, right);
                        }
                    }
                } else {
                    wants[exp] = [state];
                    this.predict(exp);
                }
            }
        }
    }

    Column.prototype.predict = function(exp) {
        var rules = this.grammar.byName[exp] || [];

        for (var i = 0; i < rules.length; i++) {
            var r = rules[i];
            var wantedBy = this.wants[exp];
            var s = new State(r, 0, this.index, wantedBy);
            this.states.push(s);
        }
    }

    Column.prototype.complete = function(left, right) {
        var copy = left.nextState(right);
        this.states.push(copy);
    }


    function Grammar(rules, start) {
        this.rules = rules;
        this.start = start || this.rules[0].name;
        var byName = this.byName = {};
        this.rules.forEach(function(rule) {
            if (!byName.hasOwnProperty(rule.name)) {
                byName[rule.name] = [];
            }
            byName[rule.name].push(rule);
        });
    }

    // So we can allow passing (rules, start) directly to Parser for backwards compatibility
    Grammar.fromCompiled = function(rules, start) {
        var lexer = rules.Lexer;
        if (rules.ParserStart) {
          start = rules.ParserStart;
          rules = rules.ParserRules;
        }
        var rules = rules.map(function (r) { return (new Rule(r.name, r.symbols, r.postprocess)); });
        var g = new Grammar(rules, start);
        g.lexer = lexer; // nb. storing lexer on Grammar is iffy, but unavoidable
        return g;
    }


    function StreamLexer() {
      this.reset("");
    }

    StreamLexer.prototype.reset = function(data, state) {
        this.buffer = data;
        this.index = 0;
        this.line = state ? state.line : 1;
        this.lastLineBreak = state ? -state.col : 0;
    }

    StreamLexer.prototype.next = function() {
        if (this.index < this.buffer.length) {
            var ch = this.buffer[this.index++];
            if (ch === '\n') {
              this.line += 1;
              this.lastLineBreak = this.index;
            }
            return {value: ch};
        }
    }

    StreamLexer.prototype.save = function() {
      return {
        line: this.line,
        col: this.index - this.lastLineBreak,
      }
    }

    StreamLexer.prototype.formatError = function(token, message) {
        // nb. this gets called after consuming the offending token,
        // so the culprit is index-1
        var buffer = this.buffer;
        if (typeof buffer === 'string') {
            var nextLineBreak = buffer.indexOf('\n', this.index);
            if (nextLineBreak === -1) nextLineBreak = buffer.length;
            var line = buffer.substring(this.lastLineBreak, nextLineBreak)
            var col = this.index - this.lastLineBreak;
            message += " at line " + this.line + " col " + col + ":\n\n";
            message += "  " + line + "\n"
            message += "  " + Array(col).join(" ") + "^"
            return message;
        } else {
            return message + " at index " + (this.index - 1);
        }
    }


    function Parser(rules, start, options) {
        if (rules instanceof Grammar) {
            var grammar = rules;
            var options = start;
        } else {
            var grammar = Grammar.fromCompiled(rules, start);
        }
        this.grammar = grammar;

        // Read options
        this.options = {
            keepHistory: false,
            lexer: grammar.lexer || new StreamLexer,
        };
        for (var key in (options || {})) {
            this.options[key] = options[key];
        }

        // Setup lexer
        this.lexer = this.options.lexer;
        this.lexerState = undefined;

        // Setup a table
        var column = new Column(grammar, 0);
        var table = this.table = [column];

        // I could be expecting anything.
        column.wants[grammar.start] = [];
        column.predict(grammar.start);
        // TODO what if start rule is nullable?
        column.process();
        this.current = 0; // token index
    }

    // create a reserved token for indicating a parse fail
    Parser.fail = {};

    Parser.prototype.feed = function(chunk) {
        var lexer = this.lexer;
        lexer.reset(chunk, this.lexerState);

        var token;
        while (token = lexer.next()) {
            // We add new states to table[current+1]
            var column = this.table[this.current];

            // GC unused states
            if (!this.options.keepHistory) {
                delete this.table[this.current - 1];
            }

            var n = this.current + 1;
            var nextColumn = new Column(this.grammar, n);
            this.table.push(nextColumn);

            // Advance all tokens that expect the symbol
            var literal = token.text !== undefined ? token.text : token.value;
            var value = lexer.constructor === StreamLexer ? token.value : token;
            var scannable = column.scannable;
            for (var w = scannable.length; w--; ) {
                var state = scannable[w];
                var expect = state.rule.symbols[state.dot];
                // Try to consume the token
                // either regex or literal
                if (expect.test ? expect.test(value) :
                    expect.type ? expect.type === token.type
                                : expect.literal === literal) {
                    // Add it
                    var next = state.nextState({data: value, token: token, isToken: true, reference: n - 1});
                    nextColumn.states.push(next);
                }
            }

            // Next, for each of the rules, we either
            // (a) complete it, and try to see if the reference row expected that
            //     rule
            // (b) predict the next nonterminal it expects by adding that
            //     nonterminal's start state
            // To prevent duplication, we also keep track of rules we have already
            // added

            nextColumn.process();

            // If needed, throw an error:
            if (nextColumn.states.length === 0) {
                // No states at all! This is not good.
                var err = new Error(this.reportError(token));
                err.offset = this.current;
                err.token = token;
                throw err;
            }

            // maybe save lexer state
            if (this.options.keepHistory) {
              column.lexerState = lexer.save()
            }

            this.current++;
        }
        if (column) {
          this.lexerState = lexer.save()
        }

        // Incrementally keep track of results
        this.results = this.finish();

        // Allow chaining, for whatever it's worth
        return this;
    };

    Parser.prototype.reportError = function(token) {
        var lines = [];
        var tokenDisplay = (token.type ? token.type + " token: " : "") + JSON.stringify(token.value !== undefined ? token.value : token);
        lines.push(this.lexer.formatError(token, "Syntax error"));
        lines.push('Unexpected ' + tokenDisplay + '. Instead, I was expecting to see one of the following:\n');
        var lastColumnIndex = this.table.length - 2;
        var lastColumn = this.table[lastColumnIndex];
        var expectantStates = lastColumn.states
            .filter(function(state) {
                var nextSymbol = state.rule.symbols[state.dot];
                return nextSymbol && typeof nextSymbol !== "string";
            });

        // Display a "state stack" for each expectant state
        // - which shows you how this state came to be, step by step.
        // If there is more than one derivation, we only display the first one.
        var stateStacks = expectantStates
            .map(function(state) {
                return this.buildFirstStateStack(state, []);
            }, this);
        // Display each state that is expecting a terminal symbol next.
        stateStacks.forEach(function(stateStack) {
            var state = stateStack[0];
            var nextSymbol = state.rule.symbols[state.dot];
            var symbolDisplay = this.getSymbolDisplay(nextSymbol);
            lines.push('A ' + symbolDisplay + ' based on:');
            this.displayStateStack(stateStack, lines);
        }, this);

        lines.push("");
        return lines.join("\n");
    };

    Parser.prototype.displayStateStack = function(stateStack, lines) {
        var lastDisplay;
        var sameDisplayCount = 0;
        for (var j = 0; j < stateStack.length; j++) {
            var state = stateStack[j];
            var display = state.rule.toString(state.dot);
            if (display === lastDisplay) {
                sameDisplayCount++;
            } else {
                if (sameDisplayCount > 0) {
                    lines.push('    ⬆ ︎' + sameDisplayCount + ' more lines identical to this');
                }
                sameDisplayCount = 0;
                lines.push('    ' + display);
            }
            lastDisplay = display;
        }
    };

    Parser.prototype.getSymbolDisplay = function(symbol) {
        var type = typeof symbol;
        if (type === "string") {
            return symbol;
        } else if (type === "object" && symbol.literal) {
            return JSON.stringify(symbol.literal);
        } else if (type === "object" && symbol instanceof RegExp) {
            return 'character matching ' + symbol;
        } else if (type === "object" && symbol.type) {
            return symbol.type + ' token';
        } else {
            throw new Error('Unknown symbol type: ' + symbol);
        }
    };

    /*
    Builds a the first state stack. You can think of a state stack as the call stack
    of the recursive-descent parser which the Nearley parse algorithm simulates.
    A state stack is represented as an array of state objects. Within a
    state stack, the first item of the array will be the starting
    state, with each successive item in the array going further back into history.

    This function needs to be given a starting state and an empty array representing
    the visited states, and it returns an single state stack.

    */
    Parser.prototype.buildFirstStateStack = function(state, visited) {
        if (visited.indexOf(state) !== -1) {
            // Found cycle, return null
            // to eliminate this path from the results, because
            // we don't know how to display it meaningfully
            return null;
        }
        if (state.wantedBy.length === 0) {
            return [state];
        }
        var prevState = state.wantedBy[0];
        var childVisited = [state].concat(visited);
        var childResult = this.buildFirstStateStack(prevState, childVisited);
        if (childResult === null) {
            return null;
        }
        return [state].concat(childResult);
    };

    Parser.prototype.save = function() {
        var column = this.table[this.current];
        column.lexerState = this.lexerState;
        return column;
    };

    Parser.prototype.restore = function(column) {
        var index = column.index;
        this.current = index;
        this.table[index] = column;
        this.table.splice(index + 1);
        this.lexerState = column.lexerState;

        // Incrementally keep track of results
        this.results = this.finish();
    };

    // nb. deprecated: use save/restore instead!
    Parser.prototype.rewind = function(index) {
        if (!this.options.keepHistory) {
            throw new Error('set option `keepHistory` to enable rewinding')
        }
        // nb. recall column (table) indicies fall between token indicies.
        //        col 0   --   token 0   --   col 1
        this.restore(this.table[index]);
    };

    Parser.prototype.finish = function() {
        // Return the possible parsings
        var considerations = [];
        var start = this.grammar.start;
        var column = this.table[this.table.length - 1]
        column.states.forEach(function (t) {
            if (t.rule.name === start
                    && t.dot === t.rule.symbols.length
                    && t.reference === 0
                    && t.data !== Parser.fail) {
                considerations.push(t);
            }
        });
        return considerations.map(function(c) {return c.data; });
    };

    return {
        Parser: Parser,
        Grammar: Grammar,
        Rule: Rule,
    };

}));

},{}],"node_modules/shuffle-array/index.js":[function(require,module,exports) {
'use strict';

/**
 * Randomize the order of the elements in a given array.
 * @param {Array} arr - The given array.
 * @param {Object} [options] - Optional configuration options.
 * @param {Boolean} [options.copy] - Sets if should return a shuffled copy of the given array. By default it's a falsy value.
 * @param {Function} [options.rng] - Specifies a custom random number generator.
 * @returns {Array}
 */
function shuffle(arr, options) {

  if (!Array.isArray(arr)) {
    throw new Error('shuffle expect an array as parameter.');
  }

  options = options || {};

  var collection = arr,
      len = arr.length,
      rng = options.rng || Math.random,
      random,
      temp;

  if (options.copy === true) {
    collection = arr.slice();
  }

  while (len) {
    random = Math.floor(rng() * len);
    len -= 1;
    temp = collection[len];
    collection[len] = collection[random];
    collection[random] = temp;
  }

  return collection;
};

/**
 * Pick one or more random elements from the given array.
 * @param {Array} arr - The given array.
 * @param {Object} [options] - Optional configuration options.
 * @param {Number} [options.picks] - Specifies how many random elements you want to pick. By default it picks 1.
 * @param {Function} [options.rng] - Specifies a custom random number generator.
 * @returns {Object}
 */
shuffle.pick = function(arr, options) {

  if (!Array.isArray(arr)) {
    throw new Error('shuffle.pick() expect an array as parameter.');
  }

  options = options || {};

  var rng = options.rng || Math.random,
      picks = options.picks || 1;

  if (typeof picks === 'number' && picks !== 1) {
    var len = arr.length,
        collection = arr.slice(),
        random = [],
        index;

    while (picks && len) {
      index = Math.floor(rng() * len);
      random.push(collection[index]);
      collection.splice(index, 1);
      len -= 1;
      picks -= 1;
    }

    return random;
  }

  return arr[Math.floor(rng() * arr.length)];
};

/**
 * Expose
 */
module.exports = shuffle;

},{}],"node_modules/random-item/index.js":[function(require,module,exports) {
'use strict';

module.exports = function (array) {
  if (!Array.isArray(array)) {
    throw new TypeError('Expected an array');
  }

  return array[Math.floor(Math.random() * array.length)];
};
},{}],"common.js":[function(require,module,exports) {
"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var __importDefault = this && this.__importDefault || function (mod) {
  return mod && mod.__esModule ? mod : {
    "default": mod
  };
};

Object.defineProperty(exports, "__esModule", {
  value: true
});

var shuffle_array_1 = __importDefault(require("shuffle-array"));

var random_item_1 = __importDefault(require("random-item"));

var vocab = {
  put: ['שם', 'שמה'],
  buy: ['קנה', 'קנתה'],
  own: ['שברשותו', 'שברשותה']
};

function word(word, gender) {
  var i = gender == 'boy' ? 0 : 1;
  return word[i];
}

function title(gender) {
  var title_first = [['לוחם', 'לוחמת'], ['נסיך', 'נסיכת'], ['מלך', 'מלכת'], ['גמד', 'פיית'], ['שודד', 'שודדת'], ['קוסם', 'מכשפת']];
  var title_second = ['השוקולד', 'החלומות', 'האור', 'החושך', 'הממתקים', 'היערות', 'הביצות', 'הגבעות'];
  var i = gender === 'boy' ? 0 : 1;
  return "".concat(random_item_1.default(title_first)[i], " ").concat(random_item_1.default(title_second));
}

function his(gender) {
  return gender == 'boy' ? 'his' : 'her';
}

exports.cat = {
  name: 'חתול',
  names: 'חתולים',
  eat: function eat() {
    return exports.snake;
  },
  eatBy: function eatBy() {
    return exports.dog;
  }
};
exports.dog = {
  name: 'כלב',
  names: 'כלבים',
  eat: function eat() {
    return exports.cat;
  },
  eatBy: function eatBy() {
    return exports.snake;
  }
};
exports.snake = {
  name: 'נחש',
  names: 'נחשים',
  eat: function eat() {
    return exports.dog;
  },
  eatBy: function eatBy() {
    return exports.cat;
  }
};

function question(animal, kid) {
  return "\u05DB\u05DE\u05D4 ".concat(animal.names, " \u05D9\u05E9 \u05DC").concat(kid.name, "?");
}

exports.question = question;

function boy(name) {
  return {
    name: name,
    gender: 'boy',
    title: title('boy')
  };
}

function girl(name) {
  return {
    name: name,
    gender: 'girl',
    title: title('girl')
  };
} // const kids = shuffle([
// boy('חבובו')
// , boy('יותם')
// , boy('אורי')
// , boy('יובל')
// , boy('אלעד')
// , boy('רוני')
// , boy('גיא')
// , girl('חבובה')
// , girl('נועה')
// , girl('דיאנה')
// , girl('שחר')
// , girl('שקד')
// , girl('נוגה בלי ו')
// , girl('מעיין')
// , girl('לוטם')
// , girl('עדי')
// , girl('דניאלה')
// ])


var kids = shuffle_array_1.default([boy('יפתח'), boy('יותם'), boy('יואב'), boy('אופיר'), boy('גלעד'), boy('שי'), boy('אלי'), girl('יעל'), girl('עינב'), girl('מעיין'), girl('ענת'), girl('טליה'), girl('איילת'), girl('פסיה')]);

function kid() {
  var kid = kids.shift();
  kids.push(kid);
  return kid;
}

function took(gender) {
  var boy = ['לקח', 'חטף', 'גנב'];
  var girl = ['לקחה', 'גזלה', 'גנבה'];
  return gender == 'boy' ? random_item_1.default(boy) : random_item_1.default(girl);
}

var NodePlusNode = /*#__PURE__*/function () {
  function NodePlusNode(l, r) {
    _classCallCheck(this, NodePlusNode);

    this.kid = kid();
    this.l = l;
    this.r = r;
  }

  _createClass(NodePlusNode, [{
    key: "strs",
    value: function strs(animal) {
      return this.l.strs(animal).concat(this.r.strs(animal)).concat(["".concat(this.kid.name, ", ").concat(this.kid.title, ", ").concat(took(this.kid.gender), " \u05D0\u05EA \u05DB\u05DC \u05D4").concat(animal.names, " \u05E9\u05DC ").concat(this.l.kid.name, " \u05D5").concat(this.r.kid.name, ".")]);
    }
  }]);

  return NodePlusNode;
}();

exports.NodePlusNode = NodePlusNode;

var NodeMinusNode = /*#__PURE__*/function () {
  function NodeMinusNode(l, r) {
    _classCallCheck(this, NodeMinusNode);

    this.kid = kid();
    this.l = l;
    this.r = r;
  }

  _createClass(NodeMinusNode, [{
    key: "strs",
    value: function strs(animal) {
      return this.l.strs(animal).concat(this.r.strs(animal.eatBy())).concat(["\u05DB\u05DC \u05D0\u05D7\u05D3 \u05DE\u05D4".concat(animal.eatBy().names, " \u05E9\u05DC ").concat(this.r.kid.name, " \u05D0\u05DB\u05DC ").concat(animal.name, " \u05D0\u05D7\u05D3 \u05E9\u05DC ").concat(this.l.kid.name, "."), "".concat(this.kid.name, ", ").concat(this.kid.title, ", ").concat(took(this.kid.gender), " \u05D0\u05EA \u05DB\u05DC \u05D4").concat(animal.names, " \u05D4\u05E0\u05D5\u05EA\u05E8\u05D9\u05DD \u05E9\u05DC ").concat(this.l.kid.name, ".")]);
    }
  }]);

  return NodeMinusNode;
}();

exports.NodeMinusNode = NodeMinusNode;

var NodeMulNode = /*#__PURE__*/function () {
  function NodeMulNode(l, r) {
    _classCallCheck(this, NodeMulNode);

    this.kid = kid();
    this.l = l;
    this.r = r;
  }

  _createClass(NodeMulNode, [{
    key: "strs",
    value: function strs(animal) {
      return this.l.strs(animal).concat(this.r.strs(animal)).concat(["\u05DC\u05DB\u05DC ".concat(animal.name, " \u05E9\u05DC ").concat(this.l.kid.name, " \u05E0\u05D5\u05DC\u05D3 \u05D2\u05D5\u05E8 \u05D0\u05D7\u05D3 \u05DE\u05DB\u05DC \u05D0\u05D7\u05D3 \u05DE\u05D4").concat(animal.names, " \u05E9\u05DC ").concat(this.r.kid.name, "."), "".concat(this.kid.name, ", ").concat(this.kid.title, ", ").concat(took(this.kid.gender), " \u05D0\u05EA \u05DB\u05DC \u05D4\u05D2\u05D5\u05E8\u05D9\u05DD \u05E9\u05E0\u05D5\u05DC\u05D3\u05D5.")]);
    }
  }]);

  return NodeMulNode;
}();

exports.NodeMulNode = NodeMulNode;

var NodeDivNode = /*#__PURE__*/function () {
  function NodeDivNode(l, r) {
    _classCallCheck(this, NodeDivNode);

    this.kid = kid();
    this.l = l;
    this.r = r;
  }

  _createClass(NodeDivNode, [{
    key: "strs",
    value: function strs(animal) {
      return this.l.strs(animal).concat(this.r.strs(animal)).concat(["".concat(this.r.kid.name, " ").concat(word(vocab.buy, this.r.kid.gender), " \u05DB\u05DC\u05D5\u05D1 \u05D0\u05D7\u05D3 \u05DC\u05DB\u05DC \u05D0\u05D7\u05D3 \u05DE\u05D4").concat(animal.names, " ").concat(word(vocab.own, this.r.kid.gender), "."), "".concat(this.l.kid.name, " ").concat(word(vocab.put, this.l.kid.gender), " \u05D0\u05EA \u05D4").concat(animal.names, " ").concat(word(vocab.own, this.l.kid.gender), " \u05D1\u05DB\u05DC\u05D5\u05D1\u05D9\u05DD \u05E9\u05DC ").concat(this.r.kid.name, ", \u05DE\u05E1\u05E4\u05E8 \u05D6\u05D4\u05D4 \u05E9\u05DC ").concat(animal.names, " \u05D1\u05DB\u05DC \u05DB\u05DC\u05D5\u05D1."), "".concat(this.kid.name, ", ").concat(this.kid.title, ", ").concat(took(this.kid.gender), " \u05D0\u05EA \u05DB\u05DC \u05D4").concat(animal.names, " \u05DE\u05D0\u05D7\u05D3 \u05D4\u05DB\u05DC\u05D5\u05D1\u05D9\u05DD.")]);
    }
  }]);

  return NodeDivNode;
}();

exports.NodeDivNode = NodeDivNode;

function count(n, animal) {
  return n == 1 ? "".concat(animal.name, " \u05D0\u05D7\u05D3") : "".concat(n, " ").concat(animal.names);
}

var NodeNumber = /*#__PURE__*/function () {
  function NodeNumber(n) {
    _classCallCheck(this, NodeNumber);

    this.kid = kid();
    this.n = n;
  }

  _createClass(NodeNumber, [{
    key: "strs",
    value: function strs(animal) {
      return ["\u05DC".concat(this.kid.name, ", ").concat(this.kid.title, ", \u05D9\u05E9 ").concat(count(this.n, animal), ".")];
    }
  }]);

  return NodeNumber;
}();

exports.NodeNumber = NodeNumber;
},{"shuffle-array":"node_modules/shuffle-array/index.js","random-item":"node_modules/random-item/index.js"}],"grammar.js":[function(require,module,exports) {
function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(n); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return; var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

// Generated automatically by nearley, version 2.19.2
// http://github.com/Hardmath123/nearley
(function () {
  function id(x) {
    return x[0];
  }

  var common = require('./common');

  var grammar = {
    Lexer: undefined,
    ParserRules: [{
      "name": "exp",
      "symbols": ["exp", "_", {
        "literal": "+"
      }, "_", "term"],
      "postprocess": function postprocess(_ref) {
        var _ref2 = _slicedToArray(_ref, 5),
            l = _ref2[0],
            $2 = _ref2[1],
            op = _ref2[2],
            $4 = _ref2[3],
            r = _ref2[4];

        return new common.NodePlusNode(l, r);
      }
    }, {
      "name": "exp",
      "symbols": ["exp", "_", {
        "literal": "-"
      }, "_", "term"],
      "postprocess": function postprocess(_ref3) {
        var _ref4 = _slicedToArray(_ref3, 5),
            l = _ref4[0],
            $2 = _ref4[1],
            op = _ref4[2],
            $4 = _ref4[3],
            r = _ref4[4];

        return new common.NodeMinusNode(l, r);
      }
    }, {
      "name": "exp",
      "symbols": ["term"],
      "postprocess": id
    }, {
      "name": "term",
      "symbols": ["term", "_", {
        "literal": "*"
      }, "_", "factor"],
      "postprocess": function postprocess(_ref5) {
        var _ref6 = _slicedToArray(_ref5, 5),
            l = _ref6[0],
            $2 = _ref6[1],
            op = _ref6[2],
            $4 = _ref6[3],
            r = _ref6[4];

        return new common.NodeMulNode(l, r);
      }
    }, {
      "name": "term",
      "symbols": ["term", "_", {
        "literal": "/"
      }, "_", "factor"],
      "postprocess": function postprocess(_ref7) {
        var _ref8 = _slicedToArray(_ref7, 5),
            l = _ref8[0],
            $2 = _ref8[1],
            op = _ref8[2],
            $4 = _ref8[3],
            r = _ref8[4];

        return new common.NodeDivNode(l, r);
      }
    }, {
      "name": "term",
      "symbols": ["factor"],
      "postprocess": id
    }, {
      "name": "factor",
      "symbols": [{
        "literal": "("
      }, "_", "exp", "_", {
        "literal": ")"
      }],
      "postprocess": function postprocess(_ref9) {
        var _ref10 = _slicedToArray(_ref9, 5),
            lp = _ref10[0],
            $2 = _ref10[1],
            exp = _ref10[2],
            $4 = _ref10[3],
            rp = _ref10[4];

        return exp;
      }
    }, {
      "name": "factor",
      "symbols": ["number"],
      "postprocess": function postprocess(_ref11) {
        var _ref12 = _slicedToArray(_ref11, 1),
            n = _ref12[0];

        return new common.NodeNumber(n);
      }
    }, {
      "name": "number$ebnf$1",
      "symbols": [/[0-9]/]
    }, {
      "name": "number$ebnf$1",
      "symbols": ["number$ebnf$1", /[0-9]/],
      "postprocess": function arrpush(d) {
        return d[0].concat([d[1]]);
      }
    }, {
      "name": "number",
      "symbols": ["number$ebnf$1"],
      "postprocess": function postprocess(_ref13) {
        var _ref14 = _slicedToArray(_ref13, 1),
            n = _ref14[0];

        return parseInt(n);
      }
    }, {
      "name": "_$ebnf$1",
      "symbols": []
    }, {
      "name": "_$ebnf$1",
      "symbols": ["_$ebnf$1", /[ \t]/],
      "postprocess": function arrpush(d) {
        return d[0].concat([d[1]]);
      }
    }, {
      "name": "_",
      "symbols": ["_$ebnf$1"]
    }],
    ParserStart: "exp"
  };

  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = grammar;
  } else {
    window.grammar = grammar;
  }
})();
},{"./common":"common.js"}],"index.js":[function(require,module,exports) {
"use strict";

var __importStar = this && this.__importStar || function (mod) {
  if (mod && mod.__esModule) return mod;
  var result = {};
  if (mod != null) for (var k in mod) {
    if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
  }
  result["default"] = mod;
  return result;
};

Object.defineProperty(exports, "__esModule", {
  value: true
});

var nearley = __importStar(require("nearley"));

var common_1 = require("./common");

document.addEventListener('DOMContentLoaded', function () {
  var grammar = require("./grammar.js");

  function parse(exp) {
    try {
      var parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
      parser.feed(exp);
      console.log(parser.results);
      var res = parser.results[0];
      return {
        story: res.strs(common_1.cat),
        question: common_1.question(common_1.cat, res.kid)
      };
    } catch (e) {
      throw e;
    }
  }

  var input = document.getElementById('input');
  var story = document.getElementById('story');
  var q = document.getElementById('question');

  function onInput() {
    try {
      var p = parse(input.value.trim());
      story.innerHTML = p.story.join(' ');
      q.innerText = p.question;
      console.log(q);
    } catch (e) {
      console.log(e);
      story.innerText = "Can't understand ".concat(input.value);
      q.innerText = '¯\_(ツ)_/¯';
    }
  }

  input.addEventListener('input', onInput);
  input.focus();
  input.value = '1 + 2';
  onInput();
});
},{"nearley":"node_modules/nearley/lib/nearley.js","./common":"common.js","./grammar.js":"grammar.js"}],"node_modules/parcel/src/builtins/hmr-runtime.js":[function(require,module,exports) {
var global = arguments[3];
var OVERLAY_ID = '__parcel__error__overlay__';
var OldModule = module.bundle.Module;

function Module(moduleName) {
  OldModule.call(this, moduleName);
  this.hot = {
    data: module.bundle.hotData,
    _acceptCallbacks: [],
    _disposeCallbacks: [],
    accept: function (fn) {
      this._acceptCallbacks.push(fn || function () {});
    },
    dispose: function (fn) {
      this._disposeCallbacks.push(fn);
    }
  };
  module.bundle.hotData = null;
}

module.bundle.Module = Module;
var checkedAssets, assetsToAccept;
var parent = module.bundle.parent;

if ((!parent || !parent.isParcelRequire) && typeof WebSocket !== 'undefined') {
  var hostname = "" || location.hostname;
  var protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  var ws = new WebSocket(protocol + '://' + hostname + ':' + "54817" + '/');

  ws.onmessage = function (event) {
    checkedAssets = {};
    assetsToAccept = [];
    var data = JSON.parse(event.data);

    if (data.type === 'update') {
      var handled = false;
      data.assets.forEach(function (asset) {
        if (!asset.isNew) {
          var didAccept = hmrAcceptCheck(global.parcelRequire, asset.id);

          if (didAccept) {
            handled = true;
          }
        }
      }); // Enable HMR for CSS by default.

      handled = handled || data.assets.every(function (asset) {
        return asset.type === 'css' && asset.generated.js;
      });

      if (handled) {
        console.clear();
        data.assets.forEach(function (asset) {
          hmrApply(global.parcelRequire, asset);
        });
        assetsToAccept.forEach(function (v) {
          hmrAcceptRun(v[0], v[1]);
        });
      } else if (location.reload) {
        // `location` global exists in a web worker context but lacks `.reload()` function.
        location.reload();
      }
    }

    if (data.type === 'reload') {
      ws.close();

      ws.onclose = function () {
        location.reload();
      };
    }

    if (data.type === 'error-resolved') {
      console.log('[parcel] ✨ Error resolved');
      removeErrorOverlay();
    }

    if (data.type === 'error') {
      console.error('[parcel] 🚨  ' + data.error.message + '\n' + data.error.stack);
      removeErrorOverlay();
      var overlay = createErrorOverlay(data);
      document.body.appendChild(overlay);
    }
  };
}

function removeErrorOverlay() {
  var overlay = document.getElementById(OVERLAY_ID);

  if (overlay) {
    overlay.remove();
  }
}

function createErrorOverlay(data) {
  var overlay = document.createElement('div');
  overlay.id = OVERLAY_ID; // html encode message and stack trace

  var message = document.createElement('div');
  var stackTrace = document.createElement('pre');
  message.innerText = data.error.message;
  stackTrace.innerText = data.error.stack;
  overlay.innerHTML = '<div style="background: black; font-size: 16px; color: white; position: fixed; height: 100%; width: 100%; top: 0px; left: 0px; padding: 30px; opacity: 0.85; font-family: Menlo, Consolas, monospace; z-index: 9999;">' + '<span style="background: red; padding: 2px 4px; border-radius: 2px;">ERROR</span>' + '<span style="top: 2px; margin-left: 5px; position: relative;">🚨</span>' + '<div style="font-size: 18px; font-weight: bold; margin-top: 20px;">' + message.innerHTML + '</div>' + '<pre>' + stackTrace.innerHTML + '</pre>' + '</div>';
  return overlay;
}

function getParents(bundle, id) {
  var modules = bundle.modules;

  if (!modules) {
    return [];
  }

  var parents = [];
  var k, d, dep;

  for (k in modules) {
    for (d in modules[k][1]) {
      dep = modules[k][1][d];

      if (dep === id || Array.isArray(dep) && dep[dep.length - 1] === id) {
        parents.push(k);
      }
    }
  }

  if (bundle.parent) {
    parents = parents.concat(getParents(bundle.parent, id));
  }

  return parents;
}

function hmrApply(bundle, asset) {
  var modules = bundle.modules;

  if (!modules) {
    return;
  }

  if (modules[asset.id] || !bundle.parent) {
    var fn = new Function('require', 'module', 'exports', asset.generated.js);
    asset.isNew = !modules[asset.id];
    modules[asset.id] = [fn, asset.deps];
  } else if (bundle.parent) {
    hmrApply(bundle.parent, asset);
  }
}

function hmrAcceptCheck(bundle, id) {
  var modules = bundle.modules;

  if (!modules) {
    return;
  }

  if (!modules[id] && bundle.parent) {
    return hmrAcceptCheck(bundle.parent, id);
  }

  if (checkedAssets[id]) {
    return;
  }

  checkedAssets[id] = true;
  var cached = bundle.cache[id];
  assetsToAccept.push([bundle, id]);

  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    return true;
  }

  return getParents(global.parcelRequire, id).some(function (id) {
    return hmrAcceptCheck(global.parcelRequire, id);
  });
}

function hmrAcceptRun(bundle, id) {
  var cached = bundle.cache[id];
  bundle.hotData = {};

  if (cached) {
    cached.hot.data = bundle.hotData;
  }

  if (cached && cached.hot && cached.hot._disposeCallbacks.length) {
    cached.hot._disposeCallbacks.forEach(function (cb) {
      cb(bundle.hotData);
    });
  }

  delete bundle.cache[id];
  bundle(id);
  cached = bundle.cache[id];

  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    cached.hot._acceptCallbacks.forEach(function (cb) {
      cb();
    });

    return true;
  }
}
},{}]},{},["node_modules/parcel/src/builtins/hmr-runtime.js","index.js"], null)
//# sourceMappingURL=/math2text.e31bb0bc.js.map