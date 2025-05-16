(function() {
  'use strict';
  var Grammar, Level, Lexeme, Token, _jsid_re, _jump_spec_back, _jump_spec_re, bind_instance_methods, debug, get_instance_methods, hide, info, partial, regex, rpr, rx;

  //===========================================================================================================
  ({hide, get_instance_methods, bind_instance_methods, debug, info, rpr} = require('./helpers'));

  //-----------------------------------------------------------------------------------------------------------
  ({partial, regex} = require('regex'));

  rx = regex('y');

  //-----------------------------------------------------------------------------------------------------------
  /* NOTE: may add punctuation later, therefore better to be restrictive */
  /* thx to https://github.com/sindresorhus/identifier-regex */
  _jsid_re = regex` ^ [ $ _ \p{ID_Start} ] [ $ _ \u200C \u200D \p{ID_Continue} ]* $ `;

  _jump_spec_back = '..';

  _jump_spec_re = regex` (?<back> ^ ${_jump_spec_back} $ ) | (?<fore> ${_jsid_re} )`;

  //===========================================================================================================
  Token = class Token {
    //---------------------------------------------------------------------------------------------------------
    constructor(cfg) {
      var ref, ref1;
      debug('Ω___1', "new Token", cfg.name, cfg.level, cfg.level.grammar);
      this.name = cfg.name;
      hide(this, 'level', cfg.level);
      hide(this, 'grammar', cfg.level.grammar);
      hide(this, 'matcher', cfg.matcher);
      hide(this, 'jump', this.constructor._parse_jump((ref = cfg.jump) != null ? ref : null));
      hide(this, 'jump_literal', (ref1 = cfg.jump) != null ? ref1 : null);
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
    static _parse_jump(jump_literal) {
      var match;
      if (jump_literal == null) {
        return null;
      }
      /* TAINT use cleartype */
      if ((match = jump_literal.match(_jump_spec_re)) == null) {
        throw new Error(`Ω___2 expected a well-formed jump literal, got ${rpr(jump_literal)}`);
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
      var ref;
      // debug 'Ω___4', token
      // debug 'Ω___5', token.jump, token.grammar.levels[ token.jump.level ] if token.jump?
      this.name = token.name;
      this.fqname = `${token.level.name}.${token.name}`;
      this.level = token.level;
      this.hit = match[0];
      this.start = match.index;
      this.stop = this.start + this.hit.length;
      this.groups = (ref = match.groups) != null ? ref : null;
      this.jump = token.jump;
      this.jump_literal = token.jump_literal;
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
        throw new Error("Ω___6 inconsistent level");
      }
      this.tokens.push(token = new Token({
        ...cfg,
        level: this
      }));
      return token;
    }

  };

  //===========================================================================================================
  Grammar = class Grammar {
    //---------------------------------------------------------------------------------------------------------
    constructor(cfg) {
      var ref, ref1;
      if (cfg == null) {
        cfg = {};
      }
      this.name = (ref = cfg.name) != null ? ref : 'g';
      this.start_name = null;
      hide(this, 'start', null);
      hide(this, 'levels', {...((ref1 = cfg.levels) != null ? ref1 : {})});
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    new_level(cfg) {
      var level;
      if (this.levels[cfg.name] != null) {
        throw new Error(`Ω___7 level ${rpr(level.name)} elready exists`);
      }
      level = new Level({
        ...cfg,
        grammar: this
      });
      this.levels[level.name] = level;
      if (this.start == null) {
        this.start = level;
      }
      if (this.start_name == null) {
        this.start_name = level.name;
      }
      return level;
    }

    //---------------------------------------------------------------------------------------------------------
    tokenize(source) {
      var f, fqname, groups, groups_rpr, hit, jump, jump_literal, jump_rpr, level, lexeme, name, ref, start, stop, token;
      ({f} = require('../../effstring'));
      start = 0;
      info('Ω___8', rpr(source));
      level = this.start;
      while (true) {
        lexeme = null;
        ref = this.levels.gnd;
        for (token of ref) {
          if ((lexeme = token.match_at(start, source)) != null) {
            break;
          }
        }
        if (lexeme == null) {
          break;
        }
        ({name, fqname, stop, hit, jump, jump_literal, groups} = lexeme);
        groups_rpr = groups != null ? rpr({...groups}) : '';
        jump_rpr = jump_literal != null ? jump_literal : '';
        info('Ω___9', f`${start}:>3.0f;:${stop}:<3.0f; ${fqname}:<20c; ${rpr(hit)}:<30c; ${jump_rpr}:<15c; ${groups_rpr}`);
        start = stop;
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
  module.exports = {Token, Lexeme, Level, Grammar, rx, _jsid_re, _jump_spec_re};

}).call(this);

//# sourceMappingURL=main.js.map