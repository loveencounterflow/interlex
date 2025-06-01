(function() {
  'use strict';
  var Grammar, Internals, Level, Levelstack, Lexeme, Token, debug, hide, hide_getter, info, internals, new_regex_tag, rpr, rx, set_getter;

  //===========================================================================================================
  ({Levelstack, hide, hide_getter, set_getter, debug, info, rpr} = require('./helpers'));

  //===========================================================================================================
  internals = new (Internals = class Internals {
    constructor() {
      var SLR;
      SLR = require('regex');
      //.........................................................................................................
      this.Levelstack = Levelstack;
      this.slevithan_regex = SLR;
      /* thx to https://github.com/sindresorhus/identifier-regex */
      this.jsid_re = SLR.regex` [ $ _ \p{ID_Start} ] [ $ _ \u200C \u200D \p{ID_Continue} ]* `;
      this.jump_spec_back = '..';
      this.jump_spec_res = [
        {
          carry: false,
          action: 'back',
          matcher: SLR.regex`^ (?<target> ${this.jump_spec_back} )   $`
        },
        {
          carry: false,
          action: 'fore',
          matcher: SLR.regex`^ (?<target> ${this.jsid_re} )   $`
        },
        {
          carry: true,
          action: 'back',
          matcher: SLR.regex`^ (?<target> ${this.jump_spec_back} ) ! $`
        },
        {
          carry: true,
          action: 'fore',
          matcher: SLR.regex`^ (?<target> ${this.jsid_re} ) ! $`
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
      var ref;
      this.name = cfg.name;
      cfg.matcher = internals.normalize_regex(cfg.matcher);
      hide(this, 'level', cfg.level);
      hide(this, 'grammar', cfg.level.grammar);
      hide(this, 'matcher', cfg.matcher);
      hide(this, 'jump', (ref = this.constructor._parse_jump(cfg.jump, this.level)) != null ? ref : null);
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
    static _parse_jump(spec, level = null) {
      var action, carry, i, len, match, matcher, ref, target;
      if (spec == null) {
        return null;
      }
      match = null;
      ref = internals.jump_spec_res;
      for (i = 0, len = ref.length; i < len; i++) {
        ({carry, action, matcher} = ref[i]);
        if ((match = spec.match(matcher)) != null) {
          break;
        }
      }
      if (match == null) {
        throw new Error(`Ωilx___5 encountered illegal jump spec ${rpr(spec)}`);
      }
      ({target} = match.groups);
      if ((level != null) && (target === level.name)) {
        throw new Error(`Ωilx___6 cannot jump to same level, got ${rpr(target)}`);
      }
      return {spec, carry, action, target};
    }

  };

  //===========================================================================================================
  Lexeme = class Lexeme {
    //---------------------------------------------------------------------------------------------------------
    constructor(token, match) {
      var ref;
      this.name = token.name;
      set_getter(this, 'fqname', () => {
        return `${this.level.name}.${this.name}`;
      });
      this.hit = match[0];
      this.start = match.index;
      this.stop = this.start + this.hit.length;
      this.length = this.hit.length;
      this.groups = (ref = match.groups) != null ? ref : null;
      this.jump = token.jump;
      this.token = token;
      this.lnr = token.grammar.state.lnr;
      this.data = Object.create(null);
      //.......................................................................................................
      this.set_level(token.level);
      hide_getter(this, 'has_data', () => {
        var _;
        for (_ in this.data) {
          return true;
        }
        return false;
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
        throw new Error("Ωilx___7 inconsistent level");
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
          throw new Error(`Ωilx___8 should never happen: got strategy: ${rpr(this.strategy)}`);
      }
      if (lexeme == null) {
        //.......................................................................................................
        /* Accept no lexeme matching but refuse lexeme with empty match: */
        return null;
      }
      if (!((lexeme.hit === '') && (lexeme.jump == null))) {
        return lexeme;
      }
      ({fqname, start} = lexeme);
      snippet = source.slice(start - 10, start) + '⚠' + source.slice(start, +(start + 10) + 1 || 9e9);
      throw new Error(`Ωilx___9 encountered zero-length match for token ${rpr(fqname)} at position ${lexeme.start} (indicated by '⚠': ${rpr(snippet)})`);
    }

  };

  //===========================================================================================================
  Grammar = class Grammar {
    //---------------------------------------------------------------------------------------------------------
    constructor(cfg) {
      var cfg_template;
      cfg_template = {
        name: 'g',
        strategy: 'first',
        emit_signals: true,
        simplify_jumps: true
      };
      //.......................................................................................................
      if (this.cfg == null) {
        this.cfg = {...cfg_template, ...cfg};
      }
      if (!this.cfg.emit_signals) {
        this.cfg.simplify_jumps = false;
      }
      this.name = this.cfg.name;
      this.state = {
        lnr: null
      };
      this.start_level_name = null;
      hide(this, 'system_tokens', null);
      hide(this, 'start_level', null);
      hide(this, 'levels', {});
      //.......................................................................................................
      this.reset_lnr(1);
      this._add_system_level();
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    reset_lnr(lnr = 1) {
      this.state.lnr = lnr;
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    _add_system_level() {
      var $signal;
      $signal = this.new_level({
        name: '$signal'
      });
      hide(this, 'system_tokens', {
        start: $signal.new_token({
          name: 'start',
          matcher: /|/
        }),
        stop: $signal.new_token({
          name: 'stop',
          matcher: /|/
        }),
        jump: $signal.new_token({
          name: 'jump',
          matcher: /|/
        }),
        error: $signal.new_token({
          name: 'error',
          matcher: /|/
        })
      });
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    new_level(cfg) {
      var is_system, level;
      is_system = cfg.name.startsWith('$');
      if (this.levels[cfg.name] != null) {
        throw new Error(`Ωilx__10 level ${rpr(level.name)} elready exists`);
      }
      level = new Level({
        ...cfg,
        grammar: this
      });
      this.levels[level.name] = level;
      if ((!is_system) && (this.start_level == null)) {
        hide(this, 'start_level', level);
        this.start_level_name = level.name;
      }
      return level;
    }

    //---------------------------------------------------------------------------------------------------------
    scan_to_list(...P) {
      return [...(this.scan(...P))];
    }

    //---------------------------------------------------------------------------------------------------------
    * scan(source) {
      yield* (function() {
        switch (true) {
          case this.cfg.simplify_jumps:
            return this._scan_1b_simplify_jumps(source);
          case this.cfg.emit_signals:
            return this._scan_2_startstop_lnr(source);
          default:
            return this._scan_1a_remove_signals(source);
        }
      }).call(this);
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    * _scan_1a_remove_signals(source) {
      var lexeme;
      for (lexeme of this._scan_2_startstop_lnr(source)) {
        if ((lexeme.fqname === '$signal.error') || (lexeme.level.name !== '$signal')) {
          yield lexeme;
        }
      }
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    * _scan_1b_simplify_jumps(source) {
      /* Consolidate all contiguous jump signals into single signal */
      /* TAINT use API? */
      var buffer, jump, last_jump, lexeme;
      buffer = [];
      for (lexeme of this._scan_2_startstop_lnr(source)) {
        if (lexeme.fqname === '$signal.jump') {
          buffer.push(lexeme);
        } else {
          switch (buffer.length) {
            case 0:
              yield lexeme;
              break;
            case 1:
              yield buffer.pop();
              break;
            default:
              jump = buffer.at(0);
              last_jump = buffer.at(-1);
              jump.stop = last_jump.stop;
              jump.data.to_level = last_jump.data.to_level;
              buffer.length = 0;
              yield jump;
              yield lexeme;
          }
          continue;
        }
      }
      //.......................................................................................................
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    * _scan_2_startstop_lnr(source) {
      yield this.system_tokens.start.match_at(0, source);
      yield* this._scan_3_match_tokens(source);
      yield this.system_tokens.stop.match_at(source.length, source);
      this.state.lnr++;
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    * _scan_3_match_tokens(source) {
      var jump, jump_after, jump_before, level, lexeme, new_level, old_level_name, stack, start;
      start = 0;
      stack = new Levelstack(this.start_level);
      lexeme = null;
      old_level_name = null;
      //.......................................................................................................
      yield this._new_jump_signal(0, source, null, this.start_level.name);
      while (true) {
        //.......................................................................................................
        level = stack.peek();
        new_level = level;
        lexeme = level.match_at(start, source);
        if (lexeme == null) {
          break; // terminate if current level has no matching tokens
        }
        start = lexeme.stop;
        jump_before = false;
        jump_after = false;
        //.....................................................................................................
        if ((jump = lexeme.jump) != null) {
          switch (jump.action) {
            case 'fore':
              stack.push((new_level = this._get_level(jump.target)));
              break;
            case 'back':
              new_level = stack.popnpeek();
              break;
            default:
              throw new Error(`Ωilx__11 should never happen: unknown jump action ${rpr(lexeme.jump.action)}`);
          }
          if (jump.carry) {
            jump_before = true;
            lexeme.set_level(new_level);
          } else {
            jump_after = true;
          }
        }
        //.....................................................................................................
        if (jump_before) {
          yield this._new_jump_signal(lexeme.start, source, level.name, lexeme.level.name);
        }
        yield lexeme;
        if (jump_after) {
          yield this._new_jump_signal(start, source, lexeme.level.name, new_level.name);
        }
      }
      //.......................................................................................................
      while (!stack.is_empty) {
        yield this._new_jump_signal(start, source, stack.pop_name(null), stack.peek_name(null));
      }
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    _new_jump_signal(start, source, from_level, to_level) {
      var R;
      R = this.system_tokens.jump.match_at(start, source);
      R.data.from_level = from_level;
      R.data.to_level = to_level;
      return R;
    }

    //---------------------------------------------------------------------------------------------------------
    _get_level(level_name) {
      var R;
      if ((R = this.levels[level_name]) != null) {
        return R;
      }
      throw new Error(`Ωilx__12 unknown level ${rpr(level_name)}`);
    }

  };

  //===========================================================================================================
  module.exports = {Token, Lexeme, Level, Grammar, internals, rx, new_regex_tag};

}).call(this);

//# sourceMappingURL=main.js.map