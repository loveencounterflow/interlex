(function() {
  'use strict';
  var Grammar, Internals, Level, Lexeme, Stack, Token, debug, hide, hide_getter, info, internals, new_regex_tag, rpr, rx, set_getter;

  //===========================================================================================================
  ({hide, hide_getter, set_getter, debug, info, rpr} = require('./helpers'));

  //-----------------------------------------------------------------------------------------------------------

  //===========================================================================================================
  internals = new (Internals = class Internals {
    constructor() {
      var SLR, jsid_noanchor_re, jsid_re, jump_spec_back, jump_spec_re;
      SLR = require('regex');
      //.........................................................................................................
      /* thx to https://github.com/sindresorhus/identifier-regex */
      jsid_noanchor_re = SLR.regex`   [ $ _ \p{ID_Start} ] [ $ _ \u200C \u200D \p{ID_Continue} ]*   `;
      jsid_re = SLR.regex` ^ [ $ _ \p{ID_Start} ] [ $ _ \u200C \u200D \p{ID_Continue} ]* $ `;
      jump_spec_back = '..';
      jump_spec_re = SLR.regex` (?<back> ^ ${jump_spec_back} $ ) | (?<fore> ${jsid_re} )`;
      //.........................................................................................................
      this.slevithan_regex = SLR;
      this.jsid_re = jsid_re;
      this.jump_spec_back = jump_spec_back;
      this.jump_spec_re = jump_spec_re;
      this.jump_spec_res = [
        {
          inex: 'bare',
          action: 'back',
          matcher: SLR.regex`^    (?<target> ${jump_spec_back}   )    $`
        },
        {
          inex: 'inclusive',
          action: 'back',
          matcher: SLR.regex`^ \] (?<target> ${jump_spec_back}   )    $`
        },
        {
          inex: 'exclusive',
          action: 'back',
          matcher: SLR.regex`^    (?<target> ${jump_spec_back}   ) \] $`
        },
        {
          inex: 'bare',
          action: 'fore',
          matcher: SLR.regex`^    (?<target> ${jsid_noanchor_re} )    $`
        },
        {
          inex: 'inclusive',
          action: 'fore',
          matcher: SLR.regex`^ \[ (?<target> ${jsid_noanchor_re} )    $`
        },
        {
          inex: 'exclusive',
          action: 'fore',
          matcher: SLR.regex`^    (?<target> ${jsid_noanchor_re} ) \[ $`
        }
      ];
      //.......................................................................................................
      // thx to https://github.com/loveencounterflow/coffeescript/commit/27e0e4cfee65ec7e1404240ccec6389b85ae9e69
      this.regex_flags_re = /^(?!.*(.).*\1)[dgimsuvy]*$/;
      this.forbidden_slr_flags_re = /[uv]/g;
      this.forbidden_plain_flags_re = /[u]/g;
      this.mandatory_slr_flags_txt = 'dy';
      this.mandatory_plain_flags_txt = 'dvy';
      //-------------------------------------------------------------------------------------------------------
      this.validate_regex_flags = (flags) => {
        if ((typeof flags) !== 'string') {
          throw new Error(`Ωilx___1 expected a text, got ${rpr(flags)}`);
        }
        if (!this.regex_flags_re.test(flags)) {
          throw new Error(`Ωilx___2 illegal or duplicate flags in ${rpr(flags)}`);
        }
        return flags;
      };
      //-------------------------------------------------------------------------------------------------------
      this.normalize_regex_flags = ({flags, mode}) => {
        var forbidden_flags_re, mandatory_flags_txt;
        /* Given a RegExp `flags` text, sets `d`, `y`, removes `u`, `v`, and returns sorted text with unique
             flags. */
        switch (mode) {
          case 'slr':
            forbidden_flags_re = this.forbidden_slr_flags_re;
            mandatory_flags_txt = this.mandatory_slr_flags_txt;
            break;
          case 'plain':
            forbidden_flags_re = this.forbidden_plain_flags_re;
            mandatory_flags_txt = this.mandatory_plain_flags_txt;
            break;
          default:
            throw new Error(`Ωilx___3 internal error: unknown mode: ${rpr(mode)}`);
        }
        flags = this.validate_regex_flags(flags != null ? flags : '');
        flags = flags.replace(forbidden_flags_re, '');
        flags += mandatory_flags_txt;
        return this.get_unique_sorted_letters(flags);
      };
      //-------------------------------------------------------------------------------------------------------
      this.get_unique_sorted_letters = (text) => {
        return [...(new Set(text))].sort().join('');
      };
      //-------------------------------------------------------------------------------------------------------
      this.normalize_regex = (regex) => {
        /* Given a `regex`, return a new regex with the same pattern but normalized flags. */
        /* TAINT use proper typing */
        if (!(regex instanceof RegExp)) {
          throw new Error(`Ωilx___4 expected a regex, got ${rpr(regex)}`);
        }
        return new RegExp(regex.source, this.normalize_regex_flags({
          flags: regex.flags,
          mode: 'plain'
        }));
      };
      //-------------------------------------------------------------------------------------------------------
      this.sort_lexemes_by_length_dec = function(lexemes) {
        return lexemes.sort(function(a, b) {
          if (a.length > b.length) {
            return -1;
          }
          if (a.length < b.length) {
            return +1;
          }
          return 0;
        });
      };
      //-------------------------------------------------------------------------------------------------------
      return void 0;
    }

  })();

  //-----------------------------------------------------------------------------------------------------------
  new_regex_tag = function(global_flags = null) {
    var regex, tag_function;
    ({regex} = internals.slevithan_regex);
    global_flags = internals.normalize_regex_flags({
      flags: global_flags,
      mode: 'slr'
    });
    //.........................................................................................................
    tag_function = function(...P) {
      return (regex(global_flags))(...P);
    };
    //.........................................................................................................
    return new Proxy(tag_function, {
      get: function(target, key) {
        var flags;
        if (typeof key !== 'string') {
          return void 0;
        }
        flags = global_flags + key;
        flags = internals.get_unique_sorted_letters(flags);
        flags = internals.normalize_regex_flags({
          flags,
          mode: 'slr'
        });
        return regex(flags);
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
      cfg.matcher = internals.normalize_regex(cfg.matcher);
      hide(this, 'level', cfg.level);
      hide(this, 'grammar', cfg.level.grammar);
      hide(this, 'matcher', cfg.matcher);
      hide(this, 'jump', (ref = this.constructor._parse_jump(cfg.jump, this.level)) != null ? ref : null);
      hide(this, 'jump_spec', (ref1 = cfg.jump) != null ? ref1 : null);
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    match_at(start, source) {
      var match;
      this.matcher.lastIndex = start;
      if ((match = source.match(this.matcher)) == null) {
        return null;
      }
      return new Lexeme(this, match);
    }

    //---------------------------------------------------------------------------------------------------------
    static _parse_jump(jump_spec, level = null) {
      var action, i, inex, len, match, matcher, ref, target;
      if (jump_spec == null) {
        return null;
      }
      match = null;
      ref = internals.jump_spec_res;
      for (i = 0, len = ref.length; i < len; i++) {
        ({inex, action, matcher} = ref[i]);
        if ((match = jump_spec.match(matcher)) != null) {
          break;
        }
      }
      if (match == null) {
        throw new Error(`Ωilx___5 encountered illegal jump spec ${rpr(jump_spec)}`);
      }
      // info 'Ωilxt___6', { jump_spec, inex, action, match.groups..., }
      ({target} = match.groups);
      if ((level != null) && (target === level.name)) {
        throw new Error(`Ωilx___7 cannot jump to same level, got ${rpr(target)}`);
      }
      return {jump_spec, inex, action, target};
    }

  };

  //===========================================================================================================
  Lexeme = class Lexeme {
    //---------------------------------------------------------------------------------------------------------
    constructor(token, match) {
      var grammar, ref;
      this.name = token.name;
      this.hit = match[0];
      this.start = match.index;
      this.stop = this.start + this.hit.length;
      this.length = this.hit.length;
      this.groups = (ref = match.groups) != null ? ref : null;
      this.jump = token.jump;
      this.jump_spec = token.jump_spec;
      grammar = token.grammar;
      this[grammar.cfg.counter_name] = grammar.state.count;
      //.......................................................................................................
      this.set_level(token.level);
      set_getter(this, 'fqname', () => {
        return `${this.level.name}.${this.name}`;
      });
      //.......................................................................................................
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    set_level(level) {
      /* TAINT should typecheck */
      this.level = level;
      return null;
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
      hide_getter(this, 'strategy', () => {
        return this.grammar.cfg.strategy;
      });
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
        throw new Error("Ωilx___8 inconsistent level");
      }
      this.tokens.push(token = new Token({
        ...cfg,
        level: this
      }));
      return token;
    }

    //---------------------------------------------------------------------------------------------------------
    match_all_at(start, source) {
      var R, lexeme, token;
      R = [];
      for (token of this) {
        if ((lexeme = token.match_at(start, source)) == null) {
          continue;
        }
        R.push(lexeme);
      }
      return R;
    }

    //---------------------------------------------------------------------------------------------------------
    match_first_at(start, source) {
      var lexeme, token;
      for (token of this) {
        if ((lexeme = token.match_at(start, source)) != null) {
          return lexeme;
        }
      }
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    match_longest_at(start, source) {
      var lexemes;
      if ((lexemes = this.match_all_at(start, source)).length === 0) {
        return null;
      }
      if (lexemes.length === 1) {
        return lexemes[0];
      }
      /* NOTE: Because JS guarantees stable sorts, we know that in case there were several lexemes with the
         same maximum length, the ones that come earlier in the unsorted list (which corresponds to the order in
         that the tokens got declared) will also come earlier after sorting; hence, the first lexeme in the list
         after sorting will be one that has both maximum length (because of the sort) *and* come earlier in the
         list of declarations (because of sort stability): */
      return (internals.sort_lexemes_by_length_dec(lexemes))[0];
    }

    //---------------------------------------------------------------------------------------------------------
    match_at(start, source) {
      var fqname, lexeme, snippet;
      switch (this.strategy) {
        case 'first':
          lexeme = this.match_first_at(start, source);
          break;
        case 'longest':
          lexeme = this.match_longest_at(start, source);
          break;
        default:
          throw new Error(`Ωilx___9 should never happen: got strategy: ${rpr(this.strategy)}`);
      }
      if (lexeme == null) {
        //.......................................................................................................
        /* Accept no lexeme matching but refuse lexeme with empty match: */
        return null;
      }
      if (lexeme.hit !== '') {
        return lexeme;
      }
      ({fqname, start} = lexeme);
      snippet = source.slice(start - 10, start) + '⚠' + source.slice(start, +(start + 10) + 1 || 9e9);
      throw new Error(`Ωilx__10 encountered zero-length match for token ${rpr(fqname)} at position ${lexeme.start} (indicated by '⚠': ${rpr(snippet)})`);
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
        counter_step: 1,
        strategy: 'first'
      };
      if (this.cfg == null) {
        this.cfg = {...cfg_template, ...cfg};
      }
      this.name = this.cfg.name;
      this.state = {
        count: null
      };
      this.reset_count();
      this.start_level_name = null;
      hide(this, 'start_level', null);
      hide(this, 'levels', {});
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    reset_count() {
      this.state.count = this.cfg.counter_value;
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    new_level(cfg) {
      var level;
      if (this.levels[cfg.name] != null) {
        throw new Error(`Ωilx__11 level ${rpr(level.name)} elready exists`);
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
      var jump, level, lexeme, new_level, stack, start;
      start = 0;
      stack = new Stack([this.start_level]);
      lexeme = null;
      while (true) {
        //.......................................................................................................
        level = stack.peek();
        lexeme = level.match_at(start, source);
        if (lexeme == null) {
          break; // terminate if current level has no matching tokens
        }
        this.state.count += this.cfg.counter_step;
        start = lexeme.stop;
        //.....................................................................................................
        if ((jump = lexeme.jump) != null) {
          switch (jump.action) {
            case 'fore':
              stack.push((new_level = this._get_level(jump.target)));
              break;
            case 'back':
              new_level = stack.pop();
              break;
            default:
              throw new Error(`Ωilx__12 should never happen: unknown jump action ${rpr(lexeme.jump.action)}`);
          }
        }
        //.....................................................................................................
        yield lexeme;
      }
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    _get_level(level_name) {
      var R;
      if ((R = this.levels[level_name]) != null) {
        return R;
      }
      throw new Error(`Ωilx__13 unknown level ${rpr(level_name)}`);
    }

  };

  //===========================================================================================================
  /*
  `Token` defines `matcher`, can jump into a level or back
  `Level` has one or more `Token`s
  `Grammar` has one or more `Level`s
  `Lexeme` produced by a `Token` instance when matcher matches source

  */
  module.exports = {Token, Lexeme, Level, Grammar, internals, rx, new_regex_tag};

}).call(this);

//# sourceMappingURL=main.js.map