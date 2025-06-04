(function() {
  'use strict';
  var Grammar, Internals, Level, Levelstack, Lexeme, Token, clone, create, debug, hide, hide_getter, info, internals, isa, isa_optional, new_regex_tag, quote_source, rpr, rx, set_getter, std, validate, validate_optional;

  //===========================================================================================================
  // insert_position_marker
  ({Levelstack, hide, hide_getter, set_getter, clone, quote_source, debug, info, rpr} = require('./helpers'));

  ({std, isa, isa_optional, create, validate, validate_optional} = require('cleartype'));

  //===========================================================================================================
  internals = new (Internals = class Internals {
    constructor() {
      var SLR;
      SLR = require('regex');
      //.........................................................................................................
      this.Levelstack = Levelstack;
      this.clone = clone;
      this.slevithan_regex = SLR;
      /* thx to https://github.com/sindresorhus/identifier-regex */
      this.jsid_re = SLR.regex` [ $ _ \p{ID_Start} ] [ $ _ \u200C \u200D \p{ID_Continue} ]* `;
      this.jump_spec_back = '..';
      this.jump_spec_res = [
        {
          carry: false,
          action: 'back',
          fit: SLR.regex`^ (?<target> ${this.jump_spec_back} )   $`
        },
        {
          carry: false,
          action: 'fore',
          fit: SLR.regex`^ (?<target> ${this.jsid_re} )   $`
        },
        {
          carry: true,
          action: 'back',
          fit: SLR.regex`^ (?<target> ${this.jump_spec_back} ) ! $`
        },
        {
          carry: true,
          action: 'fore',
          fit: SLR.regex`^ (?<target> ${this.jsid_re} ) ! $`
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
      var cfg_template, ref1;
      cfg_template = {
        name: null,
        level: null,
        grammar: null,
        fit: null,
        jump: null,
        merge: false,
        emit: true
      };
      //.......................................................................................................
      cfg = {...cfg_template, ...cfg};
      this.name = cfg.name;
      cfg.fit = internals.normalize_regex(cfg.fit);
      hide(this, 'level', cfg.level);
      hide(this, 'grammar', cfg.level.grammar);
      hide(this, 'fit', cfg.fit);
      hide(this, 'jump', (ref1 = this.constructor._parse_jump(cfg.jump, this.level)) != null ? ref1 : null);
      hide(this, 'merge', cfg.merge);
      hide(this, 'emit', cfg.emit);
      /* TAINT use proper typing */
      hide(this, 'data_merge_strategy', (function() {
        switch (true) {
          case this.merge === false:
            return null;
          case this.merge === true:
            return 'list';
          case this.merge === 'assign':
            return 'assign';
          case this.merge === 'list':
            return 'list';
          case isa(std.function, this.merge):
            return 'call';
          default:
            throw new Error(`Ωilx___5 expected a valid input for \`merge\`, got ${rpr(this.merge)}`);
        }
      }).call(this));
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    match_at(start, source) {
      var match;
      this.fit.lastIndex = start;
      if ((match = source.match(this.fit)) == null) {
        return null;
      }
      return new Lexeme(this, match);
    }

    //---------------------------------------------------------------------------------------------------------
    static _parse_jump(spec, level = null) {
      var action, carry, fit, i, len, match, ref1, target;
      if (spec == null) {
        return null;
      }
      match = null;
      ref1 = internals.jump_spec_res;
      for (i = 0, len = ref1.length; i < len; i++) {
        ({carry, action, fit} = ref1[i]);
        if ((match = spec.match(fit)) != null) {
          break;
        }
      }
      if (match == null) {
        throw new Error(`Ωilx___6 encountered illegal jump spec ${rpr(spec)}`);
      }
      ({target} = match.groups);
      if ((level != null) && (target === level.name)) {
        throw new Error(`Ωilx___7 cannot jump to same level, got ${rpr(target)}`);
      }
      return {spec, carry, action, target};
    }

  };

  //===========================================================================================================
  Lexeme = class Lexeme {
    //---------------------------------------------------------------------------------------------------------
    constructor(token, match) {
      this.name = token.name;
      this.hit = match[0];
      this.start = match.index;
      this.stop = this.start + this.hit.length;
      this.jump = token.jump;
      this.token = token;
      this.lnr = token.grammar.state.lnr;
      this.data = Object.create(null);
      set_getter(this, 'fqname', () => {
        return `${this.level.name}.${this.name}`;
      });
      set_getter(this, 'length', () => {
        return this.hit.length;
      });
      //.......................................................................................................
      this.assign(match.groups);
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
    _clone() {
      var R;
      R = clone(this);
      R.data = clone(this.data);
      return R;
    }

    //---------------------------------------------------------------------------------------------------------
    set_level(level) {
      /* TAINT should typecheck */
      this.level = level;
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    assign(...P) {
      return Object.assign(this.data, ...P);
    }

  };

  //===========================================================================================================
  Level = class Level {
    //---------------------------------------------------------------------------------------------------------
    constructor(cfg) {
      var ref1, ref2;
      if (cfg == null) {
        cfg = {};
      }
      this.name = (ref1 = cfg.name) != null ? ref1 : 'gnd';
      hide(this, 'grammar', cfg.grammar);
      hide(this, 'tokens', [...((ref2 = cfg.tokens) != null ? ref2 : [])]);
      hide_getter(this, 'strategy', () => {
        return this.grammar.cfg.strategy;
      });
      hide(this, 'positions', new Set());
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    * [Symbol.iterator]() {
      var i, len, ref1, results, t;
      ref1 = this.tokens;
      results = [];
      for (i = 0, len = ref1.length; i < len; i++) {
        t = ref1[i];
        results.push((yield t));
      }
      return results;
    }

    //---------------------------------------------------------------------------------------------------------
    _on_before_scan() {
      this.positions.clear();
      return null;
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
      /* TAINT show source */
      var fqname, lexeme, quote;
      /* Loop Detection: refuse to visit same position twice */
      if (this.positions.has(start)) {
        quote = quote_source(source, start);
        throw new Error(`Ωilx___9 encountered loop at position ${rpr(start)} ${quote}`);
      }
      this.positions.add(start);
      //.......................................................................................................
      switch (this.strategy) {
        case 'first':
          lexeme = this.match_first_at(start, source);
          break;
        case 'longest':
          lexeme = this.match_longest_at(start, source);
          break;
        default:
          throw new Error(`Ωilx__10 should never happen: got strategy: ${rpr(this.strategy)}`);
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
      quote = quote_source(source, lexeme.start);
      throw new Error(`Ωilx__11 encountered zero-length match for token ${rpr(fqname)} at position ${lexeme.start} ${quote}`);
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
        merge_jumps: true
      };
      //.......................................................................................................
      if (this.cfg == null) {
        this.cfg = {...cfg_template, ...cfg};
      }
      if (!this.cfg.emit_signals) {
        this.cfg.merge_jumps = false;
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
          fit: /|/
        }),
        stop: $signal.new_token({
          name: 'stop',
          fit: /|/
        }),
        jump: $signal.new_token({
          name: 'jump',
          fit: /|/
        }),
        error: $signal.new_token({
          name: 'error',
          fit: /|/
        })
      });
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    new_level(cfg) {
      var is_system, level;
      is_system = cfg.name.startsWith('$');
      if (this.levels[cfg.name] != null) {
        throw new Error(`Ωilx__12 level ${rpr(level.name)} elready exists`);
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

    //=========================================================================================================
    _new_signal(name, idx, source, data = null) {
      var R;
      R = this.system_tokens[name].match_at(idx, source);
      R.assign(data);
      return R;
    }

    //---------------------------------------------------------------------------------------------------------
    _new_error_signal(ref, kind, start, stop, source, message) {
      var R;
      R = this._new_signal('error', start, source, {kind, message, ref});
      R.stop = stop;
      R.hit = source.slice(start, stop);
      return R;
    }

    //---------------------------------------------------------------------------------------------------------
    _new_jump_signal(start, source, target) {
      return this._new_signal('jump', start, source, {target});
    }

    //=========================================================================================================
    scan_to_list(...P) {
      return [...(this.scan(...P))];
    }

    //---------------------------------------------------------------------------------------------------------
    scan_first(...P) {
      var lexeme;
      for (lexeme of this.scan(...P)) {
        if (lexeme.level.name !== '$signal') {
          return lexeme;
        }
      }
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    * scan(source) {
      this._notify_levels();
      yield* (function() {
        switch (true) {
          case this.cfg.merge_jumps:
            return this._scan_1b_merge_jumps(source);
          case this.cfg.emit_signals:
            return this._scan_2_validate_exhaustion(source);
          default:
            return this._scan_1a_remove_signals(source);
        }
      }).call(this);
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    _notify_levels() {
      var level, level_name, ref1;
      ref1 = this.levels;
      for (level_name in ref1) {
        level = ref1[level_name];
        level._on_before_scan();
      }
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    * _scan_1a_remove_signals(source) {
      var lexeme;
      for (lexeme of this._scan_2_validate_exhaustion(source)) {
        if ((lexeme.fqname === '$signal.error') || (lexeme.level.name !== '$signal')) {
          yield lexeme;
        }
      }
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    * _scan_1b_merge_jumps(source) {
      /* Consolidate all contiguous jump signals into single signal */
      /* TAINT use API? */
      var buffer, jump, last_jump, lexeme;
      buffer = [];
      for (lexeme of this._scan_2_validate_exhaustion(source)) {
        //.....................................................................................................
        if (lexeme.fqname === '$signal.jump') {
          buffer.push(lexeme);
          continue;
        }
        //.....................................................................................................
        if (buffer.length === 0) {
          yield lexeme;
          continue;
        }
        //.....................................................................................................
        if (buffer.length === 1) {
          yield buffer.pop();
          yield lexeme;
          continue;
        }
        //.....................................................................................................
        jump = buffer.at(0);
        last_jump = buffer.at(-1);
        jump.stop = last_jump.stop;
        jump.assign({
          target: last_jump.data.target
        });
        buffer.length = 0;
        yield jump;
        yield lexeme;
      }
      //.......................................................................................................
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    * _scan_2_validate_exhaustion(source) {
      var is_first, last_idx, lexeme;
      is_first = true;
      last_idx = source.length;
//.......................................................................................................
      for (lexeme of this._scan_3_merge(source)) {
        switch (true) {
          //...................................................................................................
          case lexeme.fqname === '$signal.stop':
            if (lexeme.stop !== last_idx) {
              yield this._new_error_signal('Ωilx__13', 'earlystop', lexeme.stop, last_idx, source, `expected stop at ${last_idx}, got ${rpr(lexeme.stop)}`);
            }
            break;
          //...................................................................................................
          case lexeme.level.name === '$signal':
            null;
            break;
          //...................................................................................................
          case is_first && (lexeme.start !== 0):
            yield this._new_error_signal('Ωilx__14', 'latestart', 0, lexeme.start, source, `expected start at 0, got ${rpr(lexeme.start)}`);
        }
        //.....................................................................................................
        yield lexeme;
        is_first = false;
      }
      //.......................................................................................................
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    * _scan_3_merge(source) {
      var active_fqname, flush, lexeme, lexemes, merge_data_as_lists;
      lexemes = [];
      active_fqname = null;
      //.......................................................................................................
      merge_data_as_lists = function(merged, lexemes) {
        var R, i, key, len, lexeme, ref1, value;
        R = Object.create(null);
        for (i = 0, len = lexemes.length; i < len; i++) {
          lexeme = lexemes[i];
          ref1 = lexeme.data;
          for (key in ref1) {
            value = ref1[key];
            (R[key] != null ? R[key] : R[key] = []).push(value);
          }
        }
        merged.assign(R);
        return null;
      };
      //.......................................................................................................
      flush = function*() {
        var last_lexeme, lxm, merged;
        if (active_fqname == null) {
          return null;
        }
        merged = (lexemes.at(0))._clone();
        last_lexeme = lexemes.at(-1);
        merged.hit = ((function() {
          var i, len, results;
          results = [];
          for (i = 0, len = lexemes.length; i < len; i++) {
            lxm = lexemes[i];
            results.push(lxm.hit);
          }
          return results;
        })()).join('');
        merged.stop = last_lexeme.stop;
        switch (merged.token.data_merge_strategy) {
          case 'assign':
            merged.assign(...((function() {
              var i, len, results;
              results = [];
              for (i = 0, len = lexemes.length; i < len; i++) {
                lxm = lexemes[i];
                results.push(lxm.data);
              }
              return results;
            })()));
            break;
          case 'call':
            merged.token.merge.call(null, {merged, lexemes});
            break;
          case 'list':
            merge_data_as_lists(merged, lexemes);
            break;
          default:
            throw new Error(`Ωilx__15 should never happen: encountered data_merge_strategy == ${rpr(merged.token.data_merge_strategy)}`);
        }
        yield merged;
        active_fqname = null;
        lexemes.length = 0;
        return null;
      };
//.......................................................................................................
      for (lexeme of this._scan_4_startstop_lnr(source)) {
        if ((!lexeme.token.merge) || (lexeme.level.name === '$signal')) {
          yield* flush();
          yield lexeme;
          continue;
        }
        if (lexeme.fqname === active_fqname) {
          lexemes.push(lexeme);
          continue;
        }
        yield* flush();
        active_fqname = lexeme.fqname;
        lexemes.push(lexeme);
      }
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    * _scan_4_startstop_lnr(source) {
      var lexeme, prv_lexeme, ref1;
      prv_lexeme = null;
      yield this._new_signal('start', 0, source);
      for (lexeme of this._scan_4_match_tokens(source)) {
        if (lexeme.level.name !== '$signal') {
          prv_lexeme = lexeme;
        }
        yield lexeme;
      }
      yield this._new_signal('stop', (ref1 = prv_lexeme != null ? prv_lexeme.stop : void 0) != null ? ref1 : 0, source);
      this.state.lnr++;
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    * _scan_4_match_tokens(source) {
      var jump, jump_after, jump_before, level, lexeme, new_level, old_level_name, stack, start;
      start = 0;
      stack = new Levelstack(this.start_level);
      lexeme = null;
      old_level_name = null;
      //.......................................................................................................
      yield this._new_jump_signal(0, source, this.start_level.name);
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
              throw new Error(`Ωilx__16 should never happen: unknown jump action ${rpr(lexeme.jump.action)}`);
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
          yield this._new_jump_signal(lexeme.start, source, lexeme.level.name);
        }
        if (lexeme.token.emit) {
          yield lexeme;
        }
        if (jump_after) {
          yield this._new_jump_signal(start, source, new_level.name);
        }
      }
      //.......................................................................................................
      while (!stack.is_empty) {
        stack.pop_name(null);
        yield this._new_jump_signal(start, source, stack.peek_name(null));
      }
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    _get_level(level_name) {
      var R;
      if ((R = this.levels[level_name]) != null) {
        return R;
      }
      throw new Error(`Ωilx__17 unknown level ${rpr(level_name)}`);
    }

  };

  //===========================================================================================================
  module.exports = {Token, Lexeme, Level, Grammar, internals, rx, new_regex_tag};

}).call(this);

//# sourceMappingURL=main.js.map