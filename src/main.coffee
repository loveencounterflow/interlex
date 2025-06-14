

'use strict'

#===========================================================================================================
{ Levelstack
  hide
  hide_getter
  set_getter
  clone
  # insert_position_marker
  quote_source
  # create_pod_from_template
  debug
  info
  rpr                   } = require './helpers'
{ type_of
  std
  isa
  isa_optional
  create
  validate
  validate_optional
  Typespace             } = require 'cleartype'


#===========================================================================================================
{ ilx, std2, } = do =>

  #---------------------------------------------------------------------------------------------------------
  ilx =
    cfg_cast:
      $isa:       ( x ) -> ( not x? ) or ( @ct.isa std.function, x ) or ( @ct.isa std2.generatorfunction, x )
      $describe:  ( x ) ->
        ### TAINT rewrite using @ct.isa &c ###
        return { cast: null,  cast_method: null,    } unless x?
        return { cast: x,     cast_method: 'call',  } if ( isa std.function,           x )
        return { cast: x,     cast_method: 'walk',  } if ( isa std2.generatorfunction, x )
        ### TAINT code duplication ###
        ### TAINT effort duplication ###
        validate ilx.cfg_cast, x

  #---------------------------------------------------------------------------------------------------------
  std2 =
    generatorfunction:
      $isa:         ( x ) -> ( Object::toString.call x ) is '[object GeneratorFunction]'
      $create:      -> ( -> yield return null )
    generator:
      $isa:         ( x ) -> ( Object::toString.call x ) is '[object Generator]'
      $create:      -> ( -> yield return null )()

  #---------------------------------------------------------------------------------------------------------
  return { ilx, std2, }



# 8888888  888b    888  88888888888  8888888888  8888888b.   888b    888         d8888  888        .d8888b.
#   888    8888b   888      888      888         888   Y88b  8888b   888        d88888  888       d88P  Y88b
#   888    88888b  888      888      888         888    888  88888b  888       d88P888  888       Y88b.
#   888    888Y88b 888      888      8888888     888   d88P  888Y88b 888      d88P 888  888        "Y888b.
#   888    888 Y88b888      888      888         8888888P"   888 Y88b888     d88P  888  888           "Y88b.
#   888    888  Y88888      888      888         888 T88b    888  Y88888    d88P   888  888             "888
#   888    888   Y8888      888      888         888  T88b   888   Y8888   d8888888888  888       Y88b  d88P
# 8888888  888    Y888      888      8888888888  888   T88b  888    Y888  d88P     888  88888888   "Y8888P"
#
#
#===========================================================================================================
internals = new class Internals
  constructor: ->
    SLR             = require 'regex'
    #.........................................................................................................
    @Levelstack           = Levelstack
    @clone                = clone
    @slevithan_regex      = SLR
    ### thx to https://github.com/sindresorhus/identifier-regex ###
    @jsid_re              = SLR.regex""" [ $ _ \p{ID_Start} ] [ $ _ \u200C \u200D \p{ID_Continue} ]* """
    @jump_spec_back       = '..'
    @jump_spec_res        = [
      { carry: false,  action: 'back', fit: SLR.regex"^ (?<target> #{ @jump_spec_back  } )   $", }
      { carry: false,  action: 'fore', fit: SLR.regex"^ (?<target> #{ @jsid_re         } )   $", }
      { carry: true,   action: 'back', fit: SLR.regex"^ (?<target> #{ @jump_spec_back  } ) ! $", }
      { carry: true,   action: 'fore', fit: SLR.regex"^ (?<target> #{ @jsid_re         } ) ! $", }
      ]
    @fqname_re            = SLR.regex"^ (?<level_name> #{ @jsid_re } ) \. (?<token_name> #{ @jsid_re } ) $"
    #.......................................................................................................
    # thx to https://github.com/loveencounterflow/coffeescript/commit/27e0e4cfee65ec7e1404240ccec6389b85ae9e69
    @regex_flags_re             = /^(?!.*(.).*\1)[dgimsuvy]*$/
    @forbidden_slr_flags_re     = /[uv]/g
    @forbidden_plain_flags_re   = /[u]/g
    @mandatory_slr_flags_txt    = 'dy'
    @mandatory_plain_flags_txt  = 'dvy'

    #-------------------------------------------------------------------------------------------------------
    @validate_regex_flags = ( flags ) =>
      unless ( typeof flags ) is 'string'
        throw new Error "Ωilx___1 expected a text, got #{rpr flags}"
      unless @regex_flags_re.test flags
        throw new Error "Ωilx___2 illegal or duplicate flags in #{rpr flags}"
      return flags

    #-------------------------------------------------------------------------------------------------------
    @normalize_regex_flags = ({ flags, mode, }) =>
      ### Given a RegExp `flags` text, sets `d`, `y`, removes `u`, `v`, and returns sorted text with unique
      flags. ###
      switch mode
        when 'slr'
          forbidden_flags_re  = @forbidden_slr_flags_re
          mandatory_flags_txt = @mandatory_slr_flags_txt
        when 'plain'
          forbidden_flags_re  = @forbidden_plain_flags_re
          mandatory_flags_txt = @mandatory_plain_flags_txt
        else throw new Error "Ωilx___3 internal error: unknown mode: #{rpr mode}"
      flags   = @validate_regex_flags flags ? ''
      flags   = flags.replace forbidden_flags_re, ''
      flags  += mandatory_flags_txt
      return @get_unique_sorted_letters flags

    #-------------------------------------------------------------------------------------------------------
    @get_unique_sorted_letters = ( text ) => [ ( new Set text )..., ].sort().join ''

    #-------------------------------------------------------------------------------------------------------
    @as_regex = ( text_or_regex ) =>
      switch type = type_of text_or_regex
        when 'regex'  then return text_or_regex
        when 'text'   then return SLR.regex"#{text_or_regex}"
        else throw new Error "Ωilx___4 expected a text or a regex, got a #{type}"

    #-------------------------------------------------------------------------------------------------------
    @normalize_regex = ( regex ) =>
      ### Given a `regex`, return a new regex with the same pattern but normalized flags. ###
      ### TAINT use proper typing ###
      unless regex instanceof RegExp
        throw new Error "Ωilx___5 expected a regex, got #{rpr regex}"
      return new RegExp regex.source, ( @normalize_regex_flags { flags: regex.flags, mode: 'plain', } )

    #-------------------------------------------------------------------------------------------------------
    @sort_lexemes_by_length_dec = ( lexemes ) -> lexemes.sort ( a, b ) ->
      return -1 if a.length > b.length
      return +1 if a.length < b.length
      return  0

    #-------------------------------------------------------------------------------------------------------
    return undefined

#-----------------------------------------------------------------------------------------------------------
new_regex_tag = ( global_flags = null ) ->
  { regex }     = internals.slevithan_regex
  global_flags  = internals.normalize_regex_flags { flags: global_flags, mode: 'slr', }
  #.........................................................................................................
  tag_function  = ( P... ) -> ( regex global_flags ) P...
  #.........................................................................................................
  return new Proxy tag_function,
    get: ( target, key ) ->
      return undefined unless typeof key is 'string'
      flags = global_flags + key
      flags = internals.get_unique_sorted_letters   flags
      flags = internals.normalize_regex_flags     { flags, mode: 'slr', }
      return regex flags

#-----------------------------------------------------------------------------------------------------------
rx = new_regex_tag()



#                                             88888888888   .d88888b.   888    d8P   8888888888  888b    888
#                                                 888      d88P" "Y88b  888   d8P    888         8888b   888
#                                                 888      888     888  888  d8P     888         88888b  888
#                                                 888      888     888  888d88K      8888888     888Y88b 888
#                                                 888      888     888  8888888b     888         888 Y88b888
#                                                 888      888     888  888  Y88b    888         888  Y88888
#                                                 888      Y88b. .d88P  888   Y88b   888         888   Y8888
#                                                 888       "Y88888P"   888    Y88b  8888888888  888    Y888
#
#
#===========================================================================================================
class Token

  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    cfg_template =
      name:         null
      level:        null
      grammar:      null
      fit:          null
      jump:         null
      merge:        false
      emit:         true
      cast:         null
    #.......................................................................................................
    cfg         = { cfg_template..., cfg..., }
    @name       = cfg.name
    cfg.fit     = internals.normalize_regex internals.as_regex cfg.fit
    hide @, 'level',                cfg.level
    hide @, 'grammar',              cfg.level.grammar
    hide @, 'fit',                  cfg.fit
    hide @, 'jump',                 ( @constructor._parse_jump cfg.jump, @level ) ? null
    hide @, 'merge',                cfg.merge
    hide @, 'emit',                 cfg.emit
    set_getter @, 'fqname',     => "#{@level.name}.#{@name}"
    { cast, cast_method, } = ilx.cfg_cast.$describe cfg.cast
    hide @, 'cast',                 cast
    hide @, 'cast_method',          cast_method
    ### TAINT use proper typing ###
    hide @, 'data_merge_strategy', switch true
      when @merge is false                        then null
      when @merge is true                         then 'list'
      when @merge is 'assign'                     then 'assign'
      when @merge is 'list'                       then 'list'
      when ( isa std.function, @merge )           then 'call'
      else throw new Error "Ωilx___6 expected a valid value for `merge`, got #{rpr @merge}"
    return undefined

  #---------------------------------------------------------------------------------------------------------
  match_at: ( start, source ) -> @_match_at start, source

  #---------------------------------------------------------------------------------------------------------
  _match_at: ( start, source, fit = null ) ->
    @fit.lastIndex = start
    return null unless ( match = source.match fit ? @fit )?
    return new Lexeme @, match

  #---------------------------------------------------------------------------------------------------------
  match_any_at: ( start, source ) ->
    ### Same as `@match_at()` but doesn't test for match, so matches always ###
    @fit.lastIndex = start
    return null unless ( match = source.match /|/ )?
    return new Lexeme @, match

  #---------------------------------------------------------------------------------------------------------
  @_parse_jump: ( spec, level = null ) ->
    return null unless spec?
    match = null
    for { carry, action, fit, } in internals.jump_spec_res
      break if ( match = spec.match fit )?
    unless match?
      throw new Error "Ωilx___7 encountered illegal jump spec #{rpr spec}"
    { target, } = match.groups
    if level? and ( target is level.name )
      throw new Error "Ωilx___8 cannot jump to same level, got #{rpr target}"
    return { spec, carry, action, target, }



#                                   888       8888888888  Y88b   d88P  8888888888  888b     d888  8888888888
#                                   888       888          Y88b d88P   888         8888b   d8888  888
#                                   888       888           Y88o88P    888         88888b.d88888  888
#                                   888       8888888        Y888P     8888888     888Y88888P888  8888888
#                                   888       888            d888b     888         888 Y888P 888  888
#                                   888       888           d88888b    888         888  Y8P  888  888
#                                   888       888          d88P Y88b   888         888   "   888  888
#                                   88888888  8888888888  d88P   Y88b  8888888888  888       888  8888888888
#
#
#===========================================================================================================
class Lexeme

  #---------------------------------------------------------------------------------------------------------
  constructor: ( token, match ) ->
    @name                 = token.name
    @hit                  = match[ 0 ]
    @start                = match.index
    @stop                 = @start + @hit.length
    @jump                 = token.jump
    @token                = token
    @lnr                  = token.grammar.state.lnr
    # @terminate            = token.termin
    @data                 = Object.create null
    set_getter @, 'fqname',     => "#{@level.name}.#{@name}"
    set_getter @, 'length',     => @hit.length
    set_getter @, 'is_error',   => /^\$?error$/.test @token.level.name
    set_getter @, 'is_signal',  => @token.level.name is '$signal'
    set_getter @, 'is_system',  => @token.level.is_system
    set_getter @, 'is_user',    => not @is_system
    hide       @, 'source',     match.input
    hide       @, 'new_lexeme', @new_lexeme.bind @
    #.......................................................................................................
    @assign match.groups
    @set_level token.level
    hide_getter @, 'has_data',    =>
      return true for _ of @data
      return false
    #.......................................................................................................
    return undefined

  #---------------------------------------------------------------------------------------------------------
  _as_proxy: ( Q... ) -> new Proxy @,
    get: ( target, key ) ->
      return target if key is 'lexeme'
      return Reflect.get arguments...

  #---------------------------------------------------------------------------------------------------------
  _clone: ->
    R       = clone @
    R.data  = clone @data
    return R

  #---------------------------------------------------------------------------------------------------------
  set_level: ( level ) ->
    ### TAINT should typecheck ###
    @level = level
    return null

  #---------------------------------------------------------------------------------------------------------
  assign: ( P... ) -> Object.assign @data, P...

  #---------------------------------------------------------------------------------------------------------
  new_lexeme: ( fqname, start, source, data = null ) ->
    token   = @token.grammar.token_from_fqname fqname
    R       = token._match_at start, source
    R.assign data
    return R


#                                                     888       8888888888  888     888  8888888888  888
#                                                     888       888         888     888  888         888
#                                                     888       888         888     888  888         888
#                                                     888       8888888     Y88b   d88P  8888888     888
#                                                     888       888          Y88b d88P   888         888
#                                                     888       888           Y88o88P    888         888
#                                                     888       888            Y888P     888         888
#                                                     88888888  8888888888      Y8P      8888888888  88888888
#
#
#===========================================================================================================
class Level

  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    cfg                          ?= {}
    @name                         = cfg.name      ? 'gnd'
    @is_system                    = cfg.is_system ? false
    { cast, cast_method, }        = ilx.cfg_cast.$describe cfg.cast
    #.......................................................................................................
    hide @, 'cast',         cast
    hide @, 'cast_method',  cast_method
    hide @, 'grammar',      cfg.grammar
    hide @, 'tokens',       Object.create null
    hide @, 'positions',    new Set()
    #.......................................................................................................
    hide_getter @, 'strategy', => @grammar.cfg.strategy
    # hide @,         'cast',         validate ilx.cfg_cast, cfg.cast ? null
    return undefined

  #---------------------------------------------------------------------------------------------------------
  [Symbol.iterator]: -> yield token for name, token of @tokens

  #---------------------------------------------------------------------------------------------------------
  _on_before_scan: ->
    @positions.clear()
    return null

  #---------------------------------------------------------------------------------------------------------
  new_token: ( cfg ) ->
    R = new Token { cfg..., level: @, }
    if Reflect.has @tokens, R.name
      throw new Error "Ωilx___9 encountered duplicate token name #{rpr R.name}"
    @tokens[ R.name ] = R
    return R

  #---------------------------------------------------------------------------------------------------------
  match_all_at: ( start, source ) ->
    R = []
    for token from @
      continue unless ( lexeme = token.match_at start, source )?
      R.push lexeme
    return R

  #---------------------------------------------------------------------------------------------------------
  match_first_at: ( start, source ) ->
    for token from @
      return lexeme if ( lexeme = token.match_at start, source )?
    return null

  #---------------------------------------------------------------------------------------------------------
  match_longest_at: ( start, source ) ->
    return null         if ( lexemes = @match_all_at start, source ).length is 0
    return lexemes[ 0 ] if lexemes.length is 1
    ### NOTE: Because JS guarantees stable sorts, we know that in case there were several lexemes with the
    same maximum length, the ones that come earlier in the unsorted list (which corresponds to the order in
    that the tokens got declared) will also come earlier after sorting; hence, the first lexeme in the list
    after sorting will be one that has both maximum length (because of the sort) *and* come earlier in the
    list of declarations (because of sort stability): ###
    return ( internals.sort_lexemes_by_length_dec lexemes )[ 0 ]

  #---------------------------------------------------------------------------------------------------------
  match_at: ( start, source ) ->
    ### Loop Detection: refuse to visit same position twice ###
    if ( not @is_system ) and @positions.has start
      ### TAINT show source ###
      quote   = quote_source source, start
      message = "encountered loop at position #{rpr start} #{quote}"
      switch @grammar.cfg.loop_errors
        when 'emit' then return @grammar._new_error_signal \
          'Ωilx__10', 'loop', start, start, source, message
        when 'throw' then throw new Error "Ωilx__11 #{message}"
        else throw new Error "Ωilx__12 should never happen: got unknown value for loop_errors: #{rpr @grammar.cfg.loop_errors}"
    @positions.add start
    #.......................................................................................................
    switch @strategy
      when 'first'    then  lexeme = @match_first_at    start, source
      when 'longest'  then  lexeme = @match_longest_at  start, source
      else throw new Error "Ωilx__13 should never happen: got strategy: #{rpr @strategy}"
    #.......................................................................................................
    ### Accept no lexeme matching but refuse lexeme with empty match: ###
    return null   unless lexeme?
    return lexeme unless ( lexeme.hit is '' ) and ( not lexeme.jump? )
    { fqname
      start } = lexeme
    quote     = quote_source source, lexeme.start
    throw new Error "Ωilx__14 encountered zero-length match for token #{rpr fqname} at position #{lexeme.start} #{quote}"


#                .d8888b.   8888888b.          d8888  888b     d888  888b     d888         d8888  8888888b.
#               d88P  Y88b  888   Y88b        d88888  8888b   d8888  8888b   d8888        d88888  888   Y88b
#               888    888  888    888       d88P888  88888b.d88888  88888b.d88888       d88P888  888    888
#               888         888   d88P      d88P 888  888Y88888P888  888Y88888P888      d88P 888  888   d88P
#               888  88888  8888888P"      d88P  888  888 Y888P 888  888 Y888P 888     d88P  888  8888888P"
#               888    888  888 T88b      d88P   888  888  Y8P  888  888  Y8P  888    d88P   888  888 T88b
#               Y88b  d88P  888  T88b    d8888888888  888   "   888  888   "   888   d8888888888  888  T88b
#                "Y8888P88  888   T88b  d88P     888  888       888  888       888  d88P     888  888   T88b
#
#
#===========================================================================================================
class Grammar

  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    cfg_template =
      name:             'g'
      strategy:         'first'
      emit_signals:     true
      loop_errors:      'emit'
      earlystop_errors: 'emit'
      cast:             null
      lnr:              1
      data:             null
      reset_lnr:        false
      reset_data:       false
      reset_errors:     false
      reset_stack:      null
      linking:          false
    #.......................................................................................................
    @cfg                   ?= { cfg_template..., cfg..., }
    #.......................................................................................................
    if ( @cfg.linking is true ) and ( @cfg.reset_stack isnt null )
      throw new Error "Ωilx__15 when linking is true, reset_stack cannt be set to true"
    @cfg.reset_stack ?= not @cfg.linking
    #.......................................................................................................
    @state =
      lnr:              null
      errors:           []
      stack:            new Levelstack()
      current_token:    null
      current_stop:     0
    #.......................................................................................................
    @name                   = @cfg.name
    @start_level_name       = null
    hide @, 'system_tokens',  null
    hide @, 'start_level',    null
    hide @, 'levels',         Object.create null
    hide @, 'data',           Object.create null
    hide_getter @, 'has_errors', -> @state.errors.length > 0
    #.......................................................................................................
    { cast, cast_method, } = ilx.cfg_cast.$describe @cfg.cast
    hide @, 'cast',         cast
    hide @, 'cast_method',  cast_method
    #.......................................................................................................
    @_compile_cfg_data()
    @_add_system_levels()
    @reset()
    return undefined

  #=========================================================================================================
  reset_lnr: ( P... ) ->
    if P.length isnt 0
      throw new Error "Ωilx__16 Grammar::cfg.reset_lnr() does not accept arguments, got #{P.length} arguments"
    @state.lnr = @cfg.lnr
    return null

  #---------------------------------------------------------------------------------------------------------
  _compile_cfg_data: ->
    @cfg.data ?= {}
    for key, descriptor of Object.getOwnPropertyDescriptors @cfg.data
      continue unless isa std.function, descriptor.value
      set_getter @cfg.data, key, descriptor.value.bind @
    return null

  #---------------------------------------------------------------------------------------------------------
  reset_data: ( P... ) ->
    if P.length isnt 0
      throw new Error "Ωilx__17 Grammar::cfg.reset_data() does not accept arguments, got #{P.length} arguments"
    delete @data[ key ] for key of @data
    @assign @data, @cfg.data
    # ( @data[ key ] = fn.call @ ) for key, fn of @data when isa std.function, fn
    return null

  #---------------------------------------------------------------------------------------------------------
  reset_stack: ->
    @state.stack.clear()
    @state.current_token = null
    return null

  #---------------------------------------------------------------------------------------------------------
  reset: ->
    @reset_lnr()
    @reset_data()
    @reset_stack()
    return null

  #---------------------------------------------------------------------------------------------------------
  reset_errors: ->
    @state.errors = []
    return null

  #---------------------------------------------------------------------------------------------------------
  assign: ( P... ) -> Object.assign @data, P...


  #=========================================================================================================
  _add_system_levels: ->
    $signal = @new_level { name: '$signal', system: true, }
    $error  = @new_level { name: '$error',  system: true, }
    hide @, 'system_tokens',
      start:      $signal.new_token { name: 'start',      fit: /|/, }
      stop:       $signal.new_token { name: 'stop',       fit: /|/, }
      pause:      $signal.new_token { name: 'pause',      fit: /|/, }
      resume:     $signal.new_token { name: 'resume',     fit: /|/, }
      jump:       $signal.new_token { name: 'jump',       fit: /|/, }
      earlystop:  $error.new_token  { name: 'earlystop',  fit: /|/, }
      loop:       $error.new_token  { name: 'loop',       fit: /|/, }
    return null

  #---------------------------------------------------------------------------------------------------------
  new_level: ( cfg ) ->
    is_system = cfg.name.startsWith '$'
    if @levels[ cfg.name ]?
      throw new Error "Ωilx__18 level #{rpr level.name} elready exists"
    level                   = new Level { cfg..., is_system, grammar: @, }
    @levels[ level.name ]   = level
    if ( not is_system ) and ( not @start_level? )
      hide @, 'start_level', level
      @start_level_name = level.name
    return level

  #=========================================================================================================
  token_from_fqname: ( fqname ) ->
    ### TAINT validate ###
    unless isa std.text, fqname
      throw new Error "Ωilx__19 expected a text for fqname, got a #{type_of fqname}"
    unless ( match = fqname.match internals.fqname_re )?
      throw new Error "Ωilx__20 expected an fqname consisting of level name, dot, token name, got #{rpr fqname}"
    { level_name, token_name, } = match.groups
    unless ( level = @levels[ level_name ] )?
      throw new Error "Ωilx__21 unknown level #{rpr level_name}"
    unless ( token = level.tokens[ token_name ] )?
      throw new Error "Ωilx__22 unknown token #{rpr token_name}"
    return token

  #=========================================================================================================
  _new_signal: ( name, start, source, data = null ) ->
    unless ( token = @system_tokens[ name ] )?
      throw new Error "Ωilx__23 should never happen: unknown signal name #{rpr name}"
    R       = token.match_at start, source
    R.assign data
    return R

  #---------------------------------------------------------------------------------------------------------
  _new_error_signal: ( ref, name, start, stop, source, message ) ->
    R       = @system_tokens[ name ].match_at start, source
    R.assign { message, ref, }
    R.stop  = stop
    R.hit   = source[ start ... stop ]
    @state.errors.push R
    return R

  #---------------------------------------------------------------------------------------------------------
  _new_jump_signal: ( start, source, target ) ->
    return @_new_signal 'jump', start, source, { target, }




  #                                                                   .d8888b    .d8888b   8888b.   88888b.
  #                                                                   88K       d88P"         "88b  888 "88b
  #                                                                   "Y8888b.  888       .d888888  888  888
  #                                                                        X88  Y88b.     888  888  888  888
  #                                                                    88888P'   "Y8888P  "Y888888  888  888
  #
  #
  #=========================================================================================================
  scan_to_list: ( P... ) -> [ ( @scan P... )..., ]

  #---------------------------------------------------------------------------------------------------------
  scan_first: ( P... ) ->
    ### Does the entire scan to ensure that any state is what it would be with `scan()` and `scan_to_list()`
    but returns one first user-level lexeme: ###
    R = null
    for lexeme from @scan P...
      R ?= lexeme if lexeme.is_user
    return R

  #---------------------------------------------------------------------------------------------------------
  scan: ( source ) ->
    @reset_errors() if @cfg.reset_errors
    @reset_data()   if @cfg.reset_data
    @reset_stack()  if @cfg.reset_stack
    @_notify_levels()
    unless @start_level?
      throw new Error "Ωilx__24 no levels have been defined; unable to scan"
    yield from @_scan_1_filter_signals source
    return null

  #---------------------------------------------------------------------------------------------------------
  _notify_levels: ->
    for level_name, level of @levels
      level._on_before_scan()
    return null

  #---------------------------------------------------------------------------------------------------------
  _scan_1_filter_signals: ( source ) ->
    if @cfg.emit_signals
      yield from @_scan_2_merge_jumps source
    else
      for lexeme from @_scan_2_merge_jumps source
        yield lexeme if lexeme.is_user or lexeme.is_error
    return null

  #---------------------------------------------------------------------------------------------------------
  _scan_2_merge_jumps: ( source ) ->
    ### Consolidate all contiguous jump signals into single signal ###
    if source is null
      yield from @_scan_3_validate_exhaustion source
      return null
    #.......................................................................................................
    buffer = []
    for lexeme from @_scan_3_validate_exhaustion source
      #.....................................................................................................
      if lexeme.fqname is '$signal.jump'
        buffer.push lexeme
        continue
      #.....................................................................................................
      if buffer.length is 0
        yield lexeme
        continue
      #.....................................................................................................
      if buffer.length is 1
        yield buffer.pop()
        yield lexeme
        continue
      #.....................................................................................................
      jump                = buffer.at  0
      ### TAINT use API? ###
      last_jump           = buffer.at -1
      jump.stop           = last_jump.stop
      jump.assign { target: last_jump.data.target, }
      buffer.length       = 0
      yield jump
      yield lexeme
    #.......................................................................................................
    return null

  #---------------------------------------------------------------------------------------------------------
  _scan_3_validate_exhaustion: ( source ) ->
    if source is null
      yield from @_scan_4_merge source
      return null
    #.......................................................................................................
    is_first    = true
    last_idx    = source.length
    #.......................................................................................................
    for lexeme from @_scan_4_merge source
      switch true
        #...................................................................................................
        when lexeme.fqname is '$signal.stop'
          if lexeme.stop isnt last_idx
            message = "expected stop at #{last_idx}, got #{rpr lexeme.stop}"
            switch @cfg.earlystop_errors
              when 'emit'
                yield @_new_error_signal 'Ωilx__25', 'earlystop', lexeme.stop, last_idx, source, \
                  "expected stop at #{last_idx}, got #{rpr lexeme.stop}"
              when 'throw'
                throw new Error "Ωilx__26 #{message}"
        #...................................................................................................
        when lexeme.level.name is '$signal'
          null
        #...................................................................................................
        when is_first and ( lexeme.start isnt 0 )
          yield @_new_error_signal 'Ωilx__27', 'latestart', 0, lexeme.start, source, \
            "expected start at 0, got #{rpr lexeme.start}"
      #.....................................................................................................
      yield lexeme
      is_first    = false
    #.......................................................................................................
    return null

  #---------------------------------------------------------------------------------------------------------
  _scan_4_merge: ( source ) ->
    if source is null
      yield from @_scan_5_insert_jumps source
      return null
    #.......................................................................................................
    lexemes       = []
    active_fqname = null
    #.......................................................................................................
    merge_data_as_lists = ( merged, lexemes ) ->
      R = Object.create null
      for lexeme in lexemes
        for key, value of lexeme.data
          ( R[ key ] ?= [] ).push value
      merged.assign R
      return null
    #.......................................................................................................
    flush = ->
      return null unless active_fqname?
      merged = ( lexemes.at 0 )._clone()
      last_lexeme = lexemes.at -1
      merged.hit  = ( lxm.hit for lxm in lexemes ).join ''
      merged.stop = last_lexeme.stop
      switch merged.token.data_merge_strategy
        when 'assign' then merged.assign ( lxm.data for lxm in lexemes )...
        when 'call'   then merged.token.merge.call null, { merged, lexemes, }
        when 'list'   then merge_data_as_lists merged, lexemes
        else throw new Error "Ωilx__28 should never happen: encountered data_merge_strategy == #{rpr merged.token.data_merge_strategy}"
      yield merged
      active_fqname = null
      lexemes.length = 0
      return null
    #.......................................................................................................
    for lexeme from @_scan_5_insert_jumps source
      if ( not lexeme.token.merge ) or lexeme.is_signal
        yield from flush()
        yield lexeme
        continue
      if lexeme.fqname is active_fqname
        lexemes.push lexeme
        continue
      yield from flush()
      active_fqname = lexeme.fqname
      lexemes.push lexeme
    return null

  #---------------------------------------------------------------------------------------------------------
  _scan_5_insert_jumps: ( source ) ->
    prv_level_name = @state.current_token?.level.name ? null
    #.......................................................................................................
    new_jump_signal = ( start, level_name ) =>
      prv_level_name = level_name
      return @_new_jump_signal start, ( source ? '' ), level_name
    #.......................................................................................................
    for lexeme from @_scan_6_insert_startstop_lnr source then switch true
      #.....................................................................................................
      when lexeme.fqname is '$signal.start'
        yield lexeme
        yield new_jump_signal 0, @start_level.name
      #.....................................................................................................
      when lexeme.fqname is '$signal.stop'
        yield new_jump_signal lexeme.start, null
        yield lexeme
      #.....................................................................................................
      when lexeme.is_user
        { token, } = lexeme
        @state.current_token = token
        yield new_jump_signal lexeme.start,  token.level.name if token.level.name  isnt prv_level_name
        yield new_jump_signal lexeme.start, lexeme.level.name if lexeme.level.name isnt prv_level_name
        yield lexeme if token.emit
      #.....................................................................................................
      else yield lexeme
    #.......................................................................................................
    return null

  #---------------------------------------------------------------------------------------------------------
  _scan_6_insert_startstop_lnr: ( source ) ->
    if source is null
      yield @_new_signal 'stop', 0, ''
      return null
    #.......................................................................................................
    @state.current_stop = 0
    if @cfg.linking and @state.current_token?
      yield @_new_signal 'resume', 0, source
    else
      yield @_new_signal 'start', 0, source
    for lexeme from @_scan_7_apply_casts source
      @state.current_stop = lexeme.stop if lexeme.is_user
      yield lexeme
    if @cfg.linking
      yield @_new_signal 'pause', @state.current_stop, source
    else
      yield @_new_signal 'stop', @state.current_stop, source
    @state.lnr++ unless @cfg.reset_lnr
    return null

  #---------------------------------------------------------------------------------------------------------
  _scan_7_apply_casts: ( source ) ->
    for lexeme from @_scan_8_match_tokens source
      unless lexeme.is_user
        yield lexeme
        continue
      #.....................................................................................................
      cast_owner = switch true
        when lexeme.token.cast? then lexeme.token
        when lexeme.level.cast? then lexeme.level
        when             @cast? then @
        else null
      #.....................................................................................................
      unless cast_owner?
        yield lexeme
        continue
      #.....................................................................................................
      switch cast_owner.cast_method
        when 'call'
          cast_owner.cast.call @, lexeme._as_proxy()
          yield lexeme
        when 'walk'
          yield from cast_owner.cast.call @, lexeme._as_proxy()
        else throw new Error "Ωilx__29 should never happen: got unknown cast_method #{rpr cast_owner.cast_method}"
    return null

  #---------------------------------------------------------------------------------------------------------
  _scan_8_match_tokens: ( source ) ->
    start           = 0
    lexeme          = null
    old_level_name  = null
    stack           = @state.stack
    goto_token      = null
    if @cfg.linking and ( goto_token = @state.current_token )?
      ### TAINT just push start_level and token.level to stack? ###
      unless goto_token.level is ( last_level = stack.peek null )
        throw new Error "Ωilx__30 expected level of #{goto_token.fqname} on stack, found #{last_level?.name ? 'nothing'}"
    else
      stack.push @start_level
    #.......................................................................................................
    loop
      level         = stack.peek()
      new_level     = level
      lexeme        = level.match_at start, source # , { goto_token, }
      break unless lexeme? # terminate if current level has no matching tokens
      start         = lexeme.stop
      #.....................................................................................................
      if ( jump = lexeme.jump )?
        switch jump.action
          when 'fore' then  stack.push ( new_level = @_get_level jump.target )
          when 'back' then  new_level = stack.popnpeek()
          else throw new Error "Ωilx__31 should never happen: unknown jump action #{rpr lexeme.jump.action}"
        if jump.carry
          lexeme.set_level new_level
      #.....................................................................................................
      yield lexeme
      ### TAINT this should really check for lexeme.terminate ###
      break if lexeme.is_error
    #.......................................................................................................
    return null

  #---------------------------------------------------------------------------------------------------------
  _get_level: ( level_name ) ->
    return R if ( R = @levels[ level_name ] )?
    throw new Error "Ωilx__32 unknown level #{rpr level_name}"


#===========================================================================================================
module.exports = {
  Token
  Lexeme
  Level
  Grammar
  internals
  rx
  new_regex_tag }

