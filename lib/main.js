(async function() {
  'use strict';
  var Grammar, Level, Lexeme, Token, bind_instance_methods, debug, demo, get_instance_methods, hide, info, jump_literal_re, partial, regex, rpr, rx;

  ({hide, get_instance_methods, bind_instance_methods, debug, info, rpr} = require('./helpers'));

  ({partial, regex} = require('regex'));

  // hide  = ( owner, name, value ) -> Object.defineProperty owner, name, { enumerable: false, value, writable: true, }
  rx = regex('y');

  //===========================================================================================================
  jump_literal_re = regex`^(
\[ (?<exclusive_jump> [^ \^ . \s \[ \] ]+ )     |
   (?<inclusive_jump> [^ \^ . \s \[ \] ]+ ) \[  |
\] (?<exclusive_back> [     .          ]  )     |
   (?<inclusive_back> [     .          ]  ) \]
)$ `;

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
      hide(this, 'jump', this.parse_jump((ref = cfg.jump) != null ? ref : null));
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
    parse_jump(jump_literal) {
      var action, affinity, key, level, level_name, match, ref;
      if (jump_literal == null) {
        return null;
      }
      /* TAINT use cleartype */
      if ((match = jump_literal.match(jump_literal_re)) == null) {
        throw new Error(`Ω___2 expected a well-formed jump literal, got ${rpr(jump_literal)}`);
      }
      ref = match.groups;
      for (key in ref) {
        level_name = ref[key];
        if (level_name == null) {
          continue;
        }
        [affinity, action] = key.split('_');
        break;
      }
      if (level_name === '.') {
        level = level_name;
      } else if ((level = this.grammar.levels[level_name]) == null) {
        throw new Error(`Ω___3 expected name of a known level, got ${rpr(level_name)}`);
      }
      return {affinity, action, level};
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
      var fqname, groups, groups_rpr, hit, jump, jump_literal, jump_rpr, level, lexeme, name, start, stop, token;
      start = 0;
      info('Ω___8', rpr(source));
      level = this.start;
      while (true) {
        lexeme = null;
        for (token of gnd) {
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
  demo = function() {
    var f, g, gnd, i, len, show_jump, string11, string12, text, texts, token;
    ({f} = require('../../effstring'));
    //===========================================================================================================
    show_jump = function(jump_literal) {
      var key, match, ref, value;
      if ((match = jump_literal.match(jump_literal_re)) != null) {
        ref = match.groups;
        for (key in ref) {
          value = ref[key];
          if (value == null) {
            continue;
          }
          info('Ω__10', rpr(jump_literal), GUY.trm.grey(key), rpr(value));
        }
      } else {
        info('Ω__11', rpr(jump_literal), null);
      }
      return null;
    };
    show_jump('abc');
    show_jump('[abc[');
    show_jump('[abc');
    show_jump('abc[');
    show_jump('[string11');
    show_jump('string11[');
    show_jump('abc]');
    show_jump(']abc');
    show_jump('.]');
    show_jump('].');
    //===========================================================================================================
    g = new Grammar({
      name: 'g'
    });
    gnd = g.new_level({
      name: 'gnd'
    });
    string11 = g.new_level({
      name: 'string11'
    });
    string12 = g.new_level({
      name: 'string12'
    });
    //.........................................................................................................
    gnd.new_token({
      name: 'name',
      matcher: rx`(?<initial>[A-Z])[a-z]*`
    });
    gnd.new_token({
      name: 'number',
      matcher: rx`[0-9]+`
    });
    gnd.new_token({
      name: 'string11_start',
      matcher: rx`(?!<\\)'`,
      jump: 'string11['
    });
    gnd.new_token({
      name: 'string12_start',
      matcher: rx`(?!<\\)"`,
      jump: 'string12['
    });
    gnd.new_token({
      name: 'paren_start',
      matcher: rx`\(`
    });
    gnd.new_token({
      name: 'paren_stop',
      matcher: rx`\)`
    });
    gnd.new_token({
      name: 'other',
      matcher: rx`[A-Za-z0-9]+`
    });
    gnd.new_token({
      name: 'ws',
      matcher: rx`\s+`
    });
    //.........................................................................................................
    string11.new_token({
      name: 'string11_stop',
      matcher: rx`'`,
      jump: '].'
    });
    string11.new_token({
      name: 'text',
      matcher: rx`[^']*`
    });
    //.........................................................................................................
    debug('Ω__12', g);
    debug('Ω__13', g.levels);
    debug('Ω__14', g.levels.gnd);
    debug('Ω__15', g.levels.gnd.tokens);
    debug('Ω__16', gnd);
    for (token of gnd) {
      debug('Ω__17', token);
    }
    //.........................................................................................................
    texts = ["Alice in Cairo 1912 (approximately)", "Alice in Cairo 1912 'approximately'"];
//.........................................................................................................
    for (i = 0, len = texts.length; i < len; i++) {
      text = texts[i];
      g.tokenize(text);
    }
    //.........................................................................................................
    return null;
  };

  //===========================================================================================================
  if (module === require.main) {
    await (() => {
      return demo();
    })();
  }

}).call(this);

//# sourceMappingURL=main.js.map