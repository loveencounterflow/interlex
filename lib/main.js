(function() {
  'use strict';
  var Grammar, Internals, Level, Levelstack, Lexeme, Token, Typespace, clone, create, debug, hide, hide_getter, ilx, info, internals, isa, isa_optional, new_regex_tag, nfa, quote_source, rpr, rx, set_getter, std, std2, type_of, validate, validate_optional;

  //===========================================================================================================
  // insert_position_marker
  // create_pod_from_template
  ({Levelstack, hide, hide_getter, set_getter, clone, quote_source, debug, info, rpr} = require('./helpers'));

  ({type_of, std, isa, isa_optional, create, validate, validate_optional, Typespace} = require('cleartype'));

  ({nfa} = require('normalize-function-arguments'));

  //===========================================================================================================
  ({ilx, std2} = (() => {
    //---------------------------------------------------------------------------------------------------------
    ilx = {
      cfg_cast: {
        $isa: function(x) {
          return (x == null) || (this.ct.isa(std.function, x)) || (this.ct.isa(std2.generatorfunction, x));
        },
        $describe: function(x) {
          if (x == null) {
            return {
              /* TAINT rewrite using @ct.isa &c */
              cast: null,
              cast_method: null
            };
          }
          if (isa(std.function, x)) {
            return {
              cast: x,
              cast_method: 'call'
            };
          }
          if (isa(std2.generatorfunction, x)) {
            return {
              cast: x,
              cast_method: 'walk'
            };
          }
          /* TAINT code duplication */
          /* TAINT effort duplication */
          return validate(ilx.cfg_cast, x);
        }
      }
    };
    //---------------------------------------------------------------------------------------------------------
    std2 = {
      generatorfunction: {
        $isa: function(x) {
          return (Object.prototype.toString.call(x)) === '[object GeneratorFunction]';
        },
        $create: function() {
          return function*() {
            return null;
          };
        }
      },
      generator: {
        $isa: function(x) {
          return (Object.prototype.toString.call(x)) === '[object Generator]';
        },
        $create: function() {
          return (function*() {
            return null;
          })();
        }
      }
    };
    //---------------------------------------------------------------------------------------------------------
    return {ilx, std2};
  })());

  // 8888888  888b    888  88888888888  8888888888  8888888b.   888b    888         d8888  888        .d8888b.
  //   888    8888b   888      888      888         888   Y88b  8888b   888        d88888  888       d88P  Y88b
  //   888    88888b  888      888      888         888    888  88888b  888       d88P888  888       Y88b.
  //   888    888Y88b 888      888      8888888     888   d88P  888Y88b 888      d88P 888  888        "Y888b.
  //   888    888 Y88b888      888      888         8888888P"   888 Y88b888     d88P  888  888           "Y88b.
  //   888    888  Y88888      888      888         888 T88b    888  Y88888    d88P   888  888             "888
  //   888    888   Y8888      888      888         888  T88b   888   Y8888   d8888888888  888       Y88b  d88P
  // 8888888  888    Y888      888      8888888888  888   T88b  888    Y888  d88P     888  88888888   "Y8888P"

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
      this.fqname_re = SLR.regex`^ (?<level_name> ${this.jsid_re} ) \. (?<token_name> ${this.jsid_re} ) $`;
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
      this.as_regex = (text_or_regex) => {
        var type;
        switch (type = type_of(text_or_regex)) {
          case 'regex':
            return text_or_regex;
          case 'text':
            return SLR.regex`${text_or_regex}`;
          default:
            throw new Error(`Ωilx___4 expected a text or a regex, got a ${type}`);
        }
      };
      //-------------------------------------------------------------------------------------------------------
      this.normalize_regex = (regex) => {
        /* Given a `regex`, return a new regex with the same pattern but normalized flags. */
        /* TAINT use proper typing */
        if (!(regex instanceof RegExp)) {
          throw new Error(`Ωilx___5 expected a regex, got ${rpr(regex)}`);
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

  //                                             88888888888   .d88888b.   888    d8P   8888888888  888b    888
  //                                                 888      d88P" "Y88b  888   d8P    888         8888b   888
  //                                                 888      888     888  888  d8P     888         88888b  888
  //                                                 888      888     888  888d88K      8888888     888Y88b 888
  //                                                 888      888     888  8888888b     888         888 Y88b888
  //                                                 888      888     888  888  Y88b    888         888  Y88888
  //                                                 888      Y88b. .d88P  888   Y88b   888         888   Y8888
  //                                                 888       "Y88888P"   888    Y88b  8888888888  888    Y888

  //===========================================================================================================
  Token = class Token {
    //---------------------------------------------------------------------------------------------------------
    constructor(cfg) {
      var cast, cast_method, cfg_template, ref1;
      cfg_template = {
        name: null,
        level: null,
        grammar: null,
        fit: null,
        jump: null,
        merge: false,
        emit: true,
        cast: null
      };
      //.......................................................................................................
      cfg = {...cfg_template, ...cfg};
      this.name = cfg.name;
      cfg.fit = internals.normalize_regex(internals.as_regex(cfg.fit));
      hide(this, 'level', cfg.level);
      hide(this, 'grammar', cfg.level.grammar);
      hide(this, 'fit', cfg.fit);
      hide(this, 'jump', (ref1 = this.constructor._parse_jump(cfg.jump, this.level)) != null ? ref1 : null);
      hide(this, 'merge', cfg.merge);
      hide(this, 'emit', cfg.emit);
      set_getter(this, 'fqname', () => {
        return `${this.level.name}.${this.name}`;
      });
      ({cast, cast_method} = ilx.cfg_cast.$describe(cfg.cast));
      hide(this, 'cast', cast);
      hide(this, 'cast_method', cast_method);
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
            throw new Error(`Ωilx___6 expected a valid value for \`merge\`, got ${rpr(this.merge)}`);
        }
      }).call(this));
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    match_at(start, source) {
      return this._match_at(start, source);
    }

    //---------------------------------------------------------------------------------------------------------
    _match_at(start, source, fit = null) {
      var match;
      this.fit.lastIndex = start;
      if ((match = source.match(fit != null ? fit : this.fit)) == null) {
        return null;
      }
      return new Lexeme(this, match);
    }

    //---------------------------------------------------------------------------------------------------------
    match_any_at(start, source) {
      var match;
      /* Same as `@match_at()` but doesn't test for match, so matches always */
      this.fit.lastIndex = start;
      if ((match = source.match(/|/)) == null) {
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
        throw new Error(`Ωilx___7 encountered illegal jump spec ${rpr(spec)}`);
      }
      ({target} = match.groups);
      if ((level != null) && (target === level.name)) {
        throw new Error(`Ωilx___8 cannot jump to same level, got ${rpr(target)}`);
      }
      return {spec, carry, action, target};
    }

  };

  //                                   888       8888888888  Y88b   d88P  8888888888  888b     d888  8888888888
  //                                   888       888          Y88b d88P   888         8888b   d8888  888
  //                                   888       888           Y88o88P    888         88888b.d88888  888
  //                                   888       8888888        Y888P     8888888     888Y88888P888  8888888
  //                                   888       888            d888b     888         888 Y888P 888  888
  //                                   888       888           d88888b    888         888  Y8P  888  888
  //                                   888       888          d88P Y88b   888         888   "   888  888
  //                                   88888888  8888888888  d88P   Y88b  8888888888  888       888  8888888888

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
      // @terminate            = token.termin
      this.data = Object.create(null);
      set_getter(this, 'fqname', () => {
        return `${this.level.name}.${this.name}`;
      });
      set_getter(this, 'length', () => {
        return this.hit.length;
      });
      set_getter(this, 'is_error', () => {
        return /^\$?error$/.test(this.token.level.name);
      });
      set_getter(this, 'is_signal', () => {
        return this.token.level.name === '$signal';
      });
      set_getter(this, 'is_system', () => {
        return this.token.level.is_system;
      });
      set_getter(this, 'is_user', () => {
        return !this.is_system;
      });
      hide(this, 'source', match.input);
      hide(this, 'new_lexeme', this.new_lexeme.bind(this));
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
    _as_proxy(...Q) {
      return new Proxy(this, {
        get: function(target, key) {
          if (key === 'lexeme') {
            return target;
          }
          return Reflect.get(...arguments);
        }
      });
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

    //---------------------------------------------------------------------------------------------------------
    new_lexeme(fqname, start, source, data = null) {
      var R, token;
      token = this.token.grammar.token_from_fqname(fqname);
      R = token._match_at(start, source);
      R.assign(data);
      return R;
    }

  };

  Level = (function() {
    //                                                     888       8888888888  888     888  8888888888  888
    //                                                     888       888         888     888  888         888
    //                                                     888       888         888     888  888         888
    //                                                     888       8888888     Y88b   d88P  8888888     888
    //                                                     888       888          Y88b d88P   888         888
    //                                                     888       888           Y88o88P    888         888
    //                                                     888       888            Y888P     888         888
    //                                                     88888888  8888888888      Y8P      8888888888  88888888

    //===========================================================================================================
    class Level {
      //---------------------------------------------------------------------------------------------------------
      constructor(cfg) {
        var cast, cast_method, ref1, ref2;
        if (cfg == null) {
          cfg = {};
        }
        this.name = (ref1 = cfg.name) != null ? ref1 : 'gnd';
        this.is_system = (ref2 = cfg.is_system) != null ? ref2 : false;
        ({cast, cast_method} = ilx.cfg_cast.$describe(cfg.cast));
        //.......................................................................................................
        hide(this, 'cast', cast);
        hide(this, 'cast_method', cast_method);
        hide(this, 'grammar', cfg.grammar);
        hide(this, 'tokens', Object.create(null));
        hide(this, 'positions', new Set());
        //.......................................................................................................
        hide_getter(this, 'strategy', () => {
          return this.grammar.cfg.strategy;
        });
        // hide @,         'cast',         validate ilx.cfg_cast, cfg.cast ? null
        return void 0;
      }

      //---------------------------------------------------------------------------------------------------------
      * [Symbol.iterator]() {
        var name, ref1, results, token;
        ref1 = this.tokens;
        results = [];
        for (name in ref1) {
          token = ref1[name];
          results.push((yield token));
        }
        return results;
      }

      //---------------------------------------------------------------------------------------------------------
      _on_before_scan() {
        this.positions.clear();
        return null;
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
        var fqname, lexeme, message, quote;
        /* Loop Detection: refuse to visit same position twice */
        if ((!this.is_system) && this.positions.has(start)) {
          quote = quote_source(source, start);
          message = `encountered loop at position ${rpr(start)} ${quote}`;
          switch (this.grammar.cfg.loop_errors) {
            case 'emit':
              return this.grammar._new_error_signal('Ωilx__10', 'loop', start, start, source, message);
            case 'throw':
              throw new Error(`Ωilx__11 ${message}`);
            default:
              throw new Error(`Ωilx__12 should never happen: got unknown value for loop_errors: ${rpr(this.grammar.cfg.loop_errors)}`);
          }
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
            throw new Error(`Ωilx__13 should never happen: got strategy: ${rpr(this.strategy)}`);
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
        throw new Error(`Ωilx__14 encountered zero-length match for token ${rpr(fqname)} at position ${lexeme.start} ${quote}`);
      }

    };

    //---------------------------------------------------------------------------------------------------------
    Level.prototype.new_token = nfa(function(name, fit, cfg) {
      var R;
      R = new Token({
        ...cfg,
        level: this
      });
      if (Reflect.has(this.tokens, R.name)) {
        throw new Error(`Ωilx___9 encountered duplicate token name ${rpr(R.name)}`);
      }
      this.tokens[R.name] = R;
      return R;
    });

    return Level;

  }).call(this);

  //                .d8888b.   8888888b.          d8888  888b     d888  888b     d888         d8888  8888888b.
  //               d88P  Y88b  888   Y88b        d88888  8888b   d8888  8888b   d8888        d88888  888   Y88b
  //               888    888  888    888       d88P888  88888b.d88888  88888b.d88888       d88P888  888    888
  //               888         888   d88P      d88P 888  888Y88888P888  888Y88888P888      d88P 888  888   d88P
  //               888  88888  8888888P"      d88P  888  888 Y888P 888  888 Y888P 888     d88P  888  8888888P"
  //               888    888  888 T88b      d88P   888  888  Y8P  888  888  Y8P  888    d88P   888  888 T88b
  //               Y88b  d88P  888  T88b    d8888888888  888   "   888  888   "   888   d8888888888  888  T88b
  //                "Y8888P88  888   T88b  d88P     888  888       888  888       888  d88P     888  888   T88b

  //===========================================================================================================
  Grammar = class Grammar {
    //---------------------------------------------------------------------------------------------------------
    constructor(cfg) {
      var base, cast, cast_method, cfg_template;
      cfg_template = {
        name: 'g',
        strategy: 'first',
        emit_signals: true,
        loop_errors: 'emit',
        earlystop_errors: 'emit',
        cast: null,
        lnr: 1,
        data: null,
        reset_lnr: false,
        reset_data: false,
        reset_errors: false,
        reset_stack: null,
        linking: false,
        supply_eol: false
      };
      //.......................................................................................................
      if (this.cfg == null) {
        this.cfg = {...cfg_template, ...cfg};
      }
      //.......................................................................................................
      if ((this.cfg.linking === true) && (this.cfg.reset_stack !== null)) {
        throw new Error("Ωilx__15 when linking is true, reset_stack cannt be set to true");
      }
      if ((base = this.cfg).reset_stack == null) {
        base.reset_stack = !this.cfg.linking;
      }
      if (this.cfg.supply_eol === true) {
        this.cfg.supply_eol = '\n';
      }
      //.......................................................................................................
      this.state = {
        lnr: null,
        errors: [],
        stack: new Levelstack(),
        current_token: null,
        current_stop: 0
      };
      //.......................................................................................................
      this.name = this.cfg.name;
      this.start_level_name = null;
      hide(this, 'system_tokens', null);
      hide(this, 'start_level', null);
      hide(this, 'levels', Object.create(null));
      hide(this, 'data', Object.create(null));
      hide_getter(this, 'has_errors', function() {
        return this.state.errors.length > 0;
      });
      //.......................................................................................................
      ({cast, cast_method} = ilx.cfg_cast.$describe(this.cfg.cast));
      hide(this, 'cast', cast);
      hide(this, 'cast_method', cast_method);
      //.......................................................................................................
      this._compile_cfg_data();
      this._add_system_levels();
      this.reset();
      return void 0;
    }

    //=========================================================================================================
    reset_lnr(...P) {
      if (P.length !== 0) {
        throw new Error(`Ωilx__16 Grammar::cfg.reset_lnr() does not accept arguments, got ${P.length} arguments`);
      }
      this.state.lnr = this.cfg.lnr;
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    _compile_cfg_data() {
      var base, descriptor, key, ref1;
      if ((base = this.cfg).data == null) {
        base.data = {};
      }
      ref1 = Object.getOwnPropertyDescriptors(this.cfg.data);
      for (key in ref1) {
        descriptor = ref1[key];
        if (!isa(std.function, descriptor.value)) {
          continue;
        }
        set_getter(this.cfg.data, key, descriptor.value.bind(this));
      }
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    reset_data(...P) {
      var key;
      if (P.length !== 0) {
        throw new Error(`Ωilx__17 Grammar::cfg.reset_data() does not accept arguments, got ${P.length} arguments`);
      }
      for (key in this.data) {
        delete this.data[key];
      }
      this.assign(this.data, this.cfg.data);
      // ( @data[ key ] = fn.call @ ) for key, fn of @data when isa std.function, fn
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    reset_stack() {
      this.state.stack.clear();
      this.state.current_token = null;
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    reset() {
      this.reset_lnr();
      this.reset_data();
      this.reset_stack();
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    reset_errors() {
      this.state.errors = [];
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    assign(...P) {
      return Object.assign(this.data, ...P);
    }

    //=========================================================================================================
    _add_system_levels() {
      var $error, $signal;
      $signal = this.new_level({
        name: '$signal',
        system: true
      });
      $error = this.new_level({
        name: '$error',
        system: true
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
        pause: $signal.new_token({
          name: 'pause',
          fit: /|/
        }),
        resume: $signal.new_token({
          name: 'resume',
          fit: /|/
        }),
        jump: $signal.new_token({
          name: 'jump',
          fit: /|/
        }),
        earlystop: $error.new_token({
          name: 'earlystop',
          fit: /|/
        }),
        loop: $error.new_token({
          name: 'loop',
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
        throw new Error(`Ωilx__18 level ${rpr(level.name)} elready exists`);
      }
      level = new Level({
        ...cfg,
        is_system,
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
    token_from_fqname(fqname) {
      var level, level_name, match, token, token_name;
      /* TAINT validate */
      if (!isa(std.text, fqname)) {
        throw new Error(`Ωilx__19 expected a text for fqname, got a ${type_of(fqname)}`);
      }
      if ((match = fqname.match(internals.fqname_re)) == null) {
        throw new Error(`Ωilx__20 expected an fqname consisting of level name, dot, token name, got ${rpr(fqname)}`);
      }
      ({level_name, token_name} = match.groups);
      if ((level = this.levels[level_name]) == null) {
        throw new Error(`Ωilx__21 unknown level ${rpr(level_name)}`);
      }
      if ((token = level.tokens[token_name]) == null) {
        throw new Error(`Ωilx__22 unknown token ${rpr(token_name)}`);
      }
      return token;
    }

    //=========================================================================================================
    _new_signal(name, start, source, data = null) {
      var R, token;
      if ((token = this.system_tokens[name]) == null) {
        throw new Error(`Ωilx__23 should never happen: unknown signal name ${rpr(name)}`);
      }
      R = token.match_at(start, source);
      R.assign(data);
      return R;
    }

    //---------------------------------------------------------------------------------------------------------
    _new_error_signal(ref, name, start, stop, source, message) {
      var R;
      R = this.system_tokens[name].match_at(start, source);
      R.assign({message, ref});
      R.stop = stop;
      R.hit = source.slice(start, stop);
      this.state.errors.push(R);
      return R;
    }

    //---------------------------------------------------------------------------------------------------------
    _new_jump_signal(start, source, target) {
      return this._new_signal('jump', start, source, {target});
    }

    //                                                                   .d8888b    .d8888b   8888b.   88888b.
    //                                                                   88K       d88P"         "88b  888 "88b
    //                                                                   "Y8888b.  888       .d888888  888  888
    //                                                                        X88  Y88b.     888  888  888  888
    //                                                                    88888P'   "Y8888P  "Y888888  888  888

    //=========================================================================================================
    scan_to_list(...P) {
      return [...(this.scan(...P))];
    }

    //---------------------------------------------------------------------------------------------------------
    scan_first(...P) {
      /* Does the entire scan to ensure that any state is what it would be with `scan()` and `scan_to_list()`
         but returns one first user-level lexeme: */
      var R, lexeme;
      R = null;
      for (lexeme of this.scan(...P)) {
        if (lexeme.is_user) {
          if (R == null) {
            R = lexeme;
          }
        }
      }
      return R;
    }

    //---------------------------------------------------------------------------------------------------------
    * scan(source) {
      if (this.start_level == null) {
        throw new Error("Ωilx__24 no levels have been defined; unable to scan");
      }
      if (this.cfg.reset_errors) {
        this.reset_errors();
      }
      if (this.cfg.reset_data) {
        this.reset_data();
      }
      if (this.cfg.reset_stack) {
        this.reset_stack();
      }
      this._notify_levels();
      if ((source != null) && (this.cfg.supply_eol !== false)) {
        source += this.cfg.supply_eol;
      }
      yield* this._scan_1_filter_signals(source);
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
    * _scan_1_filter_signals(source) {
      var lexeme;
      if (this.cfg.emit_signals) {
        yield* this._scan_2_merge_jumps(source);
      } else {
        for (lexeme of this._scan_2_merge_jumps(source)) {
          if (lexeme.is_user || lexeme.is_error) {
            yield lexeme;
          }
        }
      }
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    * _scan_2_merge_jumps(source) {
      /* TAINT use API? */
      var buffer, jump, last_jump, lexeme;
      /* Consolidate all contiguous jump signals into single signal */
      if (source === null) {
        yield* this._scan_3_validate_exhaustion(source);
        return null;
      }
      //.......................................................................................................
      buffer = [];
      for (lexeme of this._scan_3_validate_exhaustion(source)) {
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
    * _scan_3_validate_exhaustion(source) {
      var is_first, last_idx, lexeme, message;
      if (source === null) {
        yield* this._scan_4_merge(source);
        return null;
      }
      //.......................................................................................................
      is_first = true;
      last_idx = source.length;
//.......................................................................................................
      for (lexeme of this._scan_4_merge(source)) {
        switch (true) {
          //...................................................................................................
          case lexeme.fqname === '$signal.stop':
            if (lexeme.stop !== last_idx) {
              message = `expected stop at ${last_idx}, got ${rpr(lexeme.stop)}`;
              switch (this.cfg.earlystop_errors) {
                case 'emit':
                  yield this._new_error_signal('Ωilx__25', 'earlystop', lexeme.stop, last_idx, source, `expected stop at ${last_idx}, got ${rpr(lexeme.stop)}`);
                  break;
                case 'throw':
                  throw new Error(`Ωilx__26 ${message}`);
              }
            }
            break;
          //...................................................................................................
          case lexeme.level.name === '$signal':
            null;
            break;
          //...................................................................................................
          case is_first && (lexeme.start !== 0):
            yield this._new_error_signal('Ωilx__27', 'latestart', 0, lexeme.start, source, `expected start at 0, got ${rpr(lexeme.start)}`);
        }
        //.....................................................................................................
        yield lexeme;
        is_first = false;
      }
      //.......................................................................................................
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    * _scan_4_merge(source) {
      var active_fqname, flush, lexeme, lexemes, merge_data_as_lists;
      if (source === null) {
        yield* this._scan_5_insert_jumps(source);
        return null;
      }
      //.......................................................................................................
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
            throw new Error(`Ωilx__28 should never happen: encountered data_merge_strategy == ${rpr(merged.token.data_merge_strategy)}`);
        }
        yield merged;
        active_fqname = null;
        lexemes.length = 0;
        return null;
      };
//.......................................................................................................
      for (lexeme of this._scan_5_insert_jumps(source)) {
        if ((!lexeme.token.merge) || lexeme.is_signal) {
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
    * _scan_5_insert_jumps(source) {
      var lexeme, new_jump_signal, prv_level_name, ref1, ref2, token;
      prv_level_name = (ref1 = (ref2 = this.state.current_token) != null ? ref2.level.name : void 0) != null ? ref1 : null;
      //.......................................................................................................
      new_jump_signal = (start, level_name) => {
        prv_level_name = level_name;
        return this._new_jump_signal(start, source != null ? source : '', level_name);
      };
//.......................................................................................................
      for (lexeme of this._scan_6_insert_startstop_lnr(source)) {
        switch (true) {
          //.....................................................................................................
          case lexeme.fqname === '$signal.start':
            yield lexeme;
            yield new_jump_signal(0, this.start_level.name);
            break;
          //.....................................................................................................
          case lexeme.fqname === '$signal.stop':
            yield new_jump_signal(lexeme.start, null);
            yield lexeme;
            break;
          //.....................................................................................................
          case lexeme.is_user:
            ({token} = lexeme);
            this.state.current_token = token;
            if (token.level.name !== prv_level_name) {
              yield new_jump_signal(lexeme.start, token.level.name);
            }
            if (lexeme.level.name !== prv_level_name) {
              yield new_jump_signal(lexeme.start, lexeme.level.name);
            }
            if (token.emit) {
              yield lexeme;
            }
            break;
          default:
            //.....................................................................................................
            yield lexeme;
        }
      }
      //.......................................................................................................
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    * _scan_6_insert_startstop_lnr(source) {
      var lexeme;
      if (source === null) {
        yield this._new_signal('stop', 0, '');
        return null;
      }
      //.......................................................................................................
      this.state.current_stop = 0;
      if (this.cfg.linking && (this.state.current_token != null)) {
        yield this._new_signal('resume', 0, source);
      } else {
        yield this._new_signal('start', 0, source);
      }
      for (lexeme of this._scan_7_apply_casts(source)) {
        if (lexeme.is_user) {
          this.state.current_stop = lexeme.stop;
        }
        yield lexeme;
      }
      if (this.cfg.linking) {
        yield this._new_signal('pause', this.state.current_stop, source);
      } else {
        yield this._new_signal('stop', this.state.current_stop, source);
      }
      if (!this.cfg.reset_lnr) {
        this.state.lnr++;
      }
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    * _scan_7_apply_casts(source) {
      var cast_owner, lexeme;
      for (lexeme of this._scan_8_match_tokens(source)) {
        if (!lexeme.is_user) {
          yield lexeme;
          continue;
        }
        //.....................................................................................................
        cast_owner = (function() {
          switch (true) {
            case lexeme.token.cast != null:
              return lexeme.token;
            case lexeme.level.cast != null:
              return lexeme.level;
            case this.cast != null:
              return this;
            default:
              return null;
          }
        }).call(this);
        //.....................................................................................................
        if (cast_owner == null) {
          yield lexeme;
          continue;
        }
        //.....................................................................................................
        switch (cast_owner.cast_method) {
          case 'call':
            cast_owner.cast.call(this, lexeme._as_proxy());
            yield lexeme;
            break;
          case 'walk':
            yield* cast_owner.cast.call(this, lexeme._as_proxy());
            break;
          default:
            throw new Error(`Ωilx__29 should never happen: got unknown cast_method ${rpr(cast_owner.cast_method)}`);
        }
      }
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    * _scan_8_match_tokens(source) {
      var goto_token, jump, last_level, level, lexeme, new_level, old_level_name, ref1, stack, start;
      start = 0;
      lexeme = null;
      old_level_name = null;
      stack = this.state.stack;
      goto_token = null;
      if (this.cfg.linking && ((goto_token = this.state.current_token) != null)) {
        /* TAINT just push start_level and token.level to stack? */
        if (goto_token.level !== (last_level = stack.peek(null))) {
          throw new Error(`Ωilx__30 expected level of ${goto_token.fqname} on stack, found ${(ref1 = last_level != null ? last_level.name : void 0) != null ? ref1 : 'nothing'}`);
        }
      } else {
        stack.push(this.start_level);
      }
      while (true) {
        //.......................................................................................................
        level = stack.peek();
        new_level = level;
        lexeme = level.match_at(start, source); // , { goto_token, }
        if (lexeme == null) {
          break; // terminate if current level has no matching tokens
        }
        start = lexeme.stop;
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
              throw new Error(`Ωilx__31 should never happen: unknown jump action ${rpr(lexeme.jump.action)}`);
          }
          if (jump.carry) {
            lexeme.set_level(new_level);
          }
        }
        //.....................................................................................................
        yield lexeme;
        if (lexeme.is_error) {
          /* TAINT this should really check for lexeme.terminate */
          break;
        }
      }
      //.......................................................................................................
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    _get_level(level_name) {
      var R;
      if ((R = this.levels[level_name]) != null) {
        return R;
      }
      throw new Error(`Ωilx__32 unknown level ${rpr(level_name)}`);
    }

  };

  //===========================================================================================================
  module.exports = {Token, Lexeme, Level, Grammar, internals, rx, new_regex_tag};

}).call(this);

//# sourceMappingURL=main.js.map