(function() {
  'use strict';
  var Grammar, Level, Lexeme, Stack, Token, _copy_regex, _default_flags_set, _disallowed_flags_set, _jsid_re, _jump_spec_back, _jump_spec_re, _regex_flag_lower_re, _regex_flag_upper_re, _regex_flags_re, debug, hide, info, new_regex_tag, partial, regex, rpr, rx;

  //===========================================================================================================
  ({hide, debug, info, rpr} = require('./helpers'));

  //-----------------------------------------------------------------------------------------------------------
  /* NOTE: may add punctuation later, therefore better to be restrictive */
  /* thx to https://github.com/sindresorhus/identifier-regex */
  ({partial, regex} = require('regex'));

  _jsid_re = regex` ^ [ $ _ \p{ID_Start} ] [ $ _ \u200C \u200D \p{ID_Continue} ]* $ `;

  _jump_spec_back = '..';

  _jump_spec_re = regex` (?<back> ^ ${_jump_spec_back} $ ) | (?<fore> ${_jsid_re} )`;

  // thx to https://github.com/loveencounterflow/coffeescript/commit/27e0e4cfee65ec7e1404240ccec6389b85ae9e69
  _regex_flag_lower_re = /^[dgimsuvy]$/;

  _regex_flag_upper_re = /^[DGIMSUVY]$/;

  _regex_flags_re = /^(?!.*(.).*\1)[dgimsuvy]*$/;

  _default_flags_set = new Set('dy');

  _disallowed_flags_set = new Set('vuxn');

  //===========================================================================================================
  _copy_regex = function(regex, new_flags) {
    var flags, new_flag;
    flags = new Set(regex.flags);
    for (new_flag of new_flags) {
      switch (true) {
        case _regex_flag_lower_re.test(new_flag):
          flags.add(new_flag);
          break;
        case _regex_flag_upper_re.test(new_flag):
          flags.delete(new_flag.toLowerCase());
          break;
        default:
          throw new Error(`Ωilx___1 invalid regex flag ${rpr(new_flag)} in ${rpr(new_flags)}`);
      }
    }
    return new RegExp(regex.source, [...flags].join(''));
  };

  //===========================================================================================================
  new_regex_tag = function(global_flags = 'dy') {
    var R;
    if (!_regex_flags_re.test(global_flags)) {
      throw new Error(`Ωilx___2 invalid flags present in ${rpr(global_flags)}`);
    }
    R = function(...P) {
      return (regex(global_flags))(...P);
    };
    return new Proxy(R, {
      get: function(target, key) {
        var local_flags, local_flags_literal;
        if (key === Symbol.toStringTag) {
          return void 0;
        }
        local_flags = new Set(key);
        local_flags = local_flags.union(new Set(global_flags));
        local_flags = local_flags.union(_default_flags_set);
        local_flags = local_flags.difference(_disallowed_flags_set);
        local_flags_literal = [...local_flags].join('');
        if (!_regex_flags_re.test(local_flags_literal)) {
          throw new Error(`Ωilx___3 invalid flags present in ${rpr(key)}`);
        }
        return regex(local_flags_literal);
      }
    });
  };

  //-----------------------------------------------------------------------------------------------------------
  rx = new_regex_tag();

  //===========================================================================================================
  Token = class Token {
    //---------------------------------------------------------------------------------------------------------
    constructor(cfg) {
      var ref, ref1;
      this.name = cfg.name;
      /* TAINT use proper typing */
      if (!(cfg.matcher instanceof RegExp)) {
        throw new Error(`Ωilx___4 expected a regex for matcher, got ${rpr(cfg.matcher)}`);
      }
      if (!cfg.matcher.sticky) {
        throw new Error(`Ωilx___5 expected a sticky regex for matcher, got flags ${rpr(cfg.matcher.flags)}`);
      }
      hide(this, 'level', cfg.level);
      hide(this, 'grammar', cfg.level.grammar);
      hide(this, 'matcher', cfg.matcher);
      hide(this, 'jump', this.constructor._parse_jump((ref = cfg.jump) != null ? ref : null));
      hide(this, 'jump_spec', (ref1 = cfg.jump) != null ? ref1 : null);
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    match_at(start, text) {
      var match;
      this.matcher.lastIndex = start;
      if ((match = text.match(this.matcher)) == null) {
        return null;
      }
      return new Lexeme(this, match);
    }

    //---------------------------------------------------------------------------------------------------------
    static _parse_jump(jump_spec) {
      var match;
      if (jump_spec == null) {
        return null;
      }
      /* TAINT use cleartype */
      if ((match = jump_spec.match(_jump_spec_re)) == null) {
        throw new Error(`Ωilx___6 expected a well-formed jump literal, got ${rpr(jump_spec)}`);
      }
      if (match.groups.back) {
        return {
          action: 'back',
          target: null
        };
      }
      return {
        action: 'fore',
        target: match.groups.fore
      };
    }

  };

  //===========================================================================================================
  Lexeme = class Lexeme {
    //---------------------------------------------------------------------------------------------------------
    constructor(token, match) {
      var count, name, ref;
      this.name = token.name;
      this.fqname = `${token.level.name}.${token.name}`;
      this.level = token.level;
      this.hit = match[0];
      this.start = match.index;
      this.stop = this.start + this.hit.length;
      this.groups = (ref = match.groups) != null ? ref : null;
      this.jump = token.jump;
      this.jump_spec = token.jump_spec;
      name = token.grammar.cfg.counter_name;
      count = token.grammar.state.count;
      this[name] = count;
      return void 0;
    }

  };

  //===========================================================================================================
  Level = class Level {
    //---------------------------------------------------------------------------------------------------------
    constructor(cfg) {
      var ref, ref1;
      if (cfg == null) {
        cfg = {};
      }
      this.name = (ref = cfg.name) != null ? ref : 'gnd';
      hide(this, 'grammar', cfg.grammar);
      hide(this, 'tokens', [...((ref1 = cfg.tokens) != null ? ref1 : [])]);
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    * [Symbol.iterator]() {
      var i, len, ref, results, t;
      ref = this.tokens;
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        t = ref[i];
        results.push((yield t));
      }
      return results;
    }

    //---------------------------------------------------------------------------------------------------------
    new_token(cfg) {
      var token;
      if ((cfg.level != null) && cfg.level !== this) {
        throw new Error("Ωilx___7 inconsistent level");
      }
      this.tokens.push(token = new Token({
        ...cfg,
        level: this
      }));
      return token;
    }

  };

  //===========================================================================================================
  Stack = class Stack {
    //---------------------------------------------------------------------------------------------------------
    constructor(...P) {
      this.data = Array.from(...P);
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    is_empty() {
      return this.data.length === 0;
    }

    //---------------------------------------------------------------------------------------------------------
    peek() {
      if (this.is_empty()) {
        throw new Error("stack is empty");
      }
      return this.data.at(-1);
    }

    //---------------------------------------------------------------------------------------------------------
    pop() {
      if (this.is_empty()) {
        throw new Error("stack is empty");
      }
      return this.data.pop();
    }

    //---------------------------------------------------------------------------------------------------------
    push(...P) {
      return this.data.push(...P);
    }

  };

  //===========================================================================================================
  Grammar = class Grammar {
    //---------------------------------------------------------------------------------------------------------
    constructor(cfg) {
      var cfg_template;
      cfg_template = {
        name: 'g',
        counter_name: 'line_nr',
        counter_value: 1,
        counter_step: 1
      };
      if (this.cfg == null) {
        this.cfg = {...cfg_template, ...cfg};
      }
      this.state = {
        count: this.cfg.counter_value
      };
      this.name = cfg.name;
      this.start_level_name = null;
      hide(this, 'start_level', null);
      hide(this, 'levels', {});
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    new_level(cfg) {
      var level;
      if (this.levels[cfg.name] != null) {
        throw new Error(`Ωilx___8 level ${rpr(level.name)} elready exists`);
      }
      level = new Level({
        ...cfg,
        grammar: this
      });
      this.levels[level.name] = level;
      if (this.start_level == null) {
        hide(this, 'start_level', level);
        this.start_level_name = level.name;
      }
      return level;
    }

    //---------------------------------------------------------------------------------------------------------
    get_lexemes(...P) {
      return [...(this.walk_lexemes(...P))];
    }

    //---------------------------------------------------------------------------------------------------------
    * walk_lexemes(source) {
      var f, jump, level, lexeme, new_level, stack, start, token;
      ({f} = require('../../effstring'));
      start = 0;
      stack = new Stack([this.start_level]);
      while (true) {
        //.......................................................................................................
        lexeme = null;
        level = stack.peek();
        for (token of level) {
          if ((lexeme = token.match_at(start, source)) != null) {
            break;
          }
        }
        if (lexeme == null) {
          //.....................................................................................................
          /* Terminate if none of the tokens of the current level has matched at the current position: */
          break;
        }
        //.....................................................................................................
        yield lexeme;
        this.state.count += this.cfg.counter_step;
        start = lexeme.stop;
        if ((jump = lexeme.jump) == null) {
          //.....................................................................................................
          continue;
        }
        switch (jump.action) {
          //...................................................................................................
          case 'fore':
            /* TAINT encapsulate */
            if ((new_level = this.levels[jump.target]) == null) {
              throw new Error(`unknown level ${rpr(jump.target)}`);
            }
            stack.push(new_level);
            continue;
          //...................................................................................................
          case 'back':
            stack.pop();
            continue;
        }
        //.....................................................................................................
        throw new Error(`unknown jump action ${rpr(lexeme.jump.action)}`);
      }
      return null;
    }

  };

  //===========================================================================================================
  /*
  `Token` defines `matcher`, can jump into a level or back
  `Level` has one or more `Token`s
  `Grammar` has one or more `Level`s
  `Lexeme` produced by a `Token` instance when matcher matches source

  */
  module.exports = {Token, Lexeme, Level, Grammar, regex, rx, new_regex_tag, _copy_regex, _jsid_re, _jump_spec_re, _regex_flag_lower_re, _regex_flag_upper_re, _regex_flags_re};

}).call(this);

//# sourceMappingURL=main.js.map