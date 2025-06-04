

'use strict'

#===========================================================================================================
{ Levelstack
  hide
  hide_getter
  set_getter
  clone
  # insert_position_marker
  quote_source
  debug
  info
  rpr                   } = require './helpers'
{ std
  isa
  isa_optional
  create
  validate
  validate_optional     } = require 'cleartype'


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
    @normalize_regex = ( regex ) =>
      ### Given a `regex`, return a new regex with the same pattern but normalized flags. ###
      ### TAINT use proper typing ###
      unless regex instanceof RegExp
        throw new Error "Ωilx___4 expected a regex, got #{rpr regex}"
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
    #.......................................................................................................
    cfg         = { cfg_template..., cfg..., }
    @name       = cfg.name
    cfg.fit     = internals.normalize_regex cfg.fit
    hide @, 'level',                cfg.level
    hide @, 'grammar',              cfg.level.grammar
    hide @, 'fit',                  cfg.fit
    hide @, 'jump',                 ( @constructor._parse_jump cfg.jump, @level ) ? null
    hide @, 'merge',                cfg.merge
    hide @, 'emit',                 cfg.emit
    ### TAINT use proper typing ###
    hide @, 'data_merge_strategy', switch true
      when @merge is false                        then null
      when @merge is true                         then 'list'
      when @merge is 'assign'                     then 'assign'
      when @merge is 'list'                       then 'list'
      when ( isa std.function, @merge )           then 'call'
      else throw new Error "Ωilx___5 expected a valid input for `merge`, got #{rpr @merge}"
    return undefined

  #---------------------------------------------------------------------------------------------------------
  match_at: ( start, source ) ->
    @fit.lastIndex = start
    return null unless ( match = source.match @fit )?
    return new Lexeme @, match

  #---------------------------------------------------------------------------------------------------------
  @_parse_jump: ( spec, level = null ) ->
    return null unless spec?
    match = null
    for { carry, action, fit, } in internals.jump_spec_res
      break if ( match = spec.match fit )?
    unless match?
      throw new Error "Ωilx___6 encountered illegal jump spec #{rpr spec}"
    { target, } = match.groups
    if level? and ( target is level.name )
      throw new Error "Ωilx___7 cannot jump to same level, got #{rpr target}"
    return { spec, carry, action, target, }


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
    set_getter @, 'fqname',   => "#{@level.name}.#{@name}"
    set_getter @, 'length',   => @hit.length
    set_getter @, 'is_error', => @token.level.name is '$error'
    #.......................................................................................................
    @assign match.groups
    @set_level token.level
    hide_getter @, 'has_data',    =>
      return true for _ of @data
      return false
    #.......................................................................................................
    return undefined

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


#===========================================================================================================
class Level

  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    cfg            ?= {}
    @name           = cfg.name      ? 'gnd'
    @is_system      = cfg.is_system ? false
    hide @,         'grammar',  cfg.grammar
    hide @,         'tokens',   [ ( cfg.tokens ? [] )..., ]
    hide_getter @,  'strategy', => @grammar.cfg.strategy
    hide @,         'positions', new Set()
    return undefined

  #---------------------------------------------------------------------------------------------------------
  [Symbol.iterator]: -> yield t for t in @tokens

  #---------------------------------------------------------------------------------------------------------
  _on_before_scan: ->
    @positions.clear()
    return null

  #---------------------------------------------------------------------------------------------------------
  new_token: ( cfg ) ->
    if cfg.level? and cfg.level isnt @
      throw new Error "Ωilx___8 inconsistent level"
    @tokens.push token = new Token { cfg..., level: @, }
    return token

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
    if @positions.has start
      ### TAINT show source ###
      quote   = quote_source source, start
      message = "encountered loop at position #{rpr start} #{quote}"
      switch @grammar.cfg.loop_errors
        when 'emit' then return @grammar._new_error_signal \
          'Ωilx___9', 'loop', start, start, source, message
        when 'throw' then throw new Error "Ωilx__10 #{message}"
        else throw new Error "Ωilx__11 should never happen: got unknown value for loop_errors: #{rpr @grammar.cfg.loop_errors}"
    @positions.add start
    #.......................................................................................................
    switch @strategy
      when 'first'    then  lexeme = @match_first_at    start, source
      when 'longest'  then  lexeme = @match_longest_at  start, source
      else throw new Error "Ωilx__12 should never happen: got strategy: #{rpr @strategy}"
    #.......................................................................................................
    ### Accept no lexeme matching but refuse lexeme with empty match: ###
    return null   unless lexeme?
    return lexeme unless ( lexeme.hit is '' ) and ( not lexeme.jump? )
    { fqname
      start } = lexeme
    quote     = quote_source source, lexeme.start
    throw new Error "Ωilx__13 encountered zero-length match for token #{rpr fqname} at position #{lexeme.start} #{quote}"



#===========================================================================================================
class Grammar

  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    cfg_template =
      name:           'g'
      strategy:       'first'
      emit_signals:   true
      merge_jumps:    true
      loop_errors:    'emit'
    #.......................................................................................................
    @cfg                   ?= { cfg_template..., cfg..., }
    @cfg.merge_jumps        = false unless @cfg.emit_signals
    @name                   = @cfg.name
    @state                  = { lnr: null, }
    @start_level_name       = null
    hide @, 'system_tokens',  null
    hide @, 'start_level',    null
    hide @, 'levels',         {}
    #.......................................................................................................
    @reset_lnr 1
    @_add_system_levels()
    return undefined

  #---------------------------------------------------------------------------------------------------------
  reset_lnr: ( lnr = 1 ) ->
    @state.lnr = lnr
    return null

  #---------------------------------------------------------------------------------------------------------
  _add_system_levels: ->
    $signal = @new_level { name: '$signal', system: true, }
    $error  = @new_level { name: '$error',  system: true, }
    hide @, 'system_tokens',
      start:      $signal.new_token { name: 'start',      fit: /|/, }
      stop:       $signal.new_token { name: 'stop',       fit: /|/, }
      jump:       $signal.new_token { name: 'jump',       fit: /|/, }
      earlystop:  $error.new_token  { name: 'earlystop',  fit: /|/, }
      loop:       $error.new_token  { name: 'loop',       fit: /|/, }
    return null

  #---------------------------------------------------------------------------------------------------------
  new_level: ( cfg ) ->
    is_system = cfg.name.startsWith '$'
    if @levels[ cfg.name ]?
      throw new Error "Ωilx__14 level #{rpr level.name} elready exists"
    level                   = new Level { cfg..., is_system, grammar: @, }
    @levels[ level.name ]   = level
    if ( not is_system ) and ( not @start_level? )
      hide @, 'start_level', level
      @start_level_name = level.name
    return level

  #=========================================================================================================
  _new_signal: ( name, start, source, data = null ) ->
    R       = @system_tokens[ name ].match_at start, source
    R.assign data
    return R

  #---------------------------------------------------------------------------------------------------------
  _new_error_signal: ( ref, name, start, stop, source, message ) ->
    R       = @system_tokens[ name ].match_at start, source
    R.assign { message, ref, }
    R.stop  = stop
    R.hit   = source[ start ... stop ]
    return R

  #---------------------------------------------------------------------------------------------------------
  _new_jump_signal: ( start, source, target ) ->
    return @_new_signal 'jump', start, source, { target, }

  #=========================================================================================================
  scan_to_list: ( P... ) -> [ ( @scan P... )..., ]

  #---------------------------------------------------------------------------------------------------------
  scan_first: ( P... ) ->
    for lexeme from @scan P...
      return lexeme unless lexeme.level.name is '$signal'
    return null

  #---------------------------------------------------------------------------------------------------------
  scan: ( source ) ->
    @_notify_levels()
    yield from switch true
      when @cfg.merge_jumps     then  @_scan_1b_merge_jumps         source
      when @cfg.emit_signals    then  @_scan_2_validate_exhaustion  source
      else                            @_scan_1a_remove_signals      source
    return null

  #---------------------------------------------------------------------------------------------------------
  _notify_levels: ->
    for level_name, level of @levels
      level._on_before_scan()
    return null

  #---------------------------------------------------------------------------------------------------------
  _scan_1a_remove_signals: ( source ) ->
    for lexeme from @_scan_2_validate_exhaustion source
      yield lexeme if ( lexeme.fqname is '$signal.error' ) or ( lexeme.level.name isnt '$signal' )
    return null

  #---------------------------------------------------------------------------------------------------------
  _scan_1b_merge_jumps: ( source ) ->
    ### Consolidate all contiguous jump signals into single signal ###
    buffer = []
    for lexeme from @_scan_2_validate_exhaustion source
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
  _scan_2_validate_exhaustion: ( source ) ->
    is_first    = true
    last_idx    = source.length
    #.......................................................................................................
    for lexeme from @_scan_3_merge source
      switch true
        #...................................................................................................
        when lexeme.fqname is '$signal.stop'
          if lexeme.stop isnt last_idx
            yield @_new_error_signal 'Ωilx__15', 'earlystop', lexeme.stop, last_idx, source, \
              "expected stop at #{last_idx}, got #{rpr lexeme.stop}"
        #...................................................................................................
        when lexeme.level.name is '$signal'
          null
        #...................................................................................................
        when is_first and ( lexeme.start isnt 0 )
          yield @_new_error_signal 'Ωilx__16', 'latestart', 0, lexeme.start, source, \
            "expected start at 0, got #{rpr lexeme.start}"
      #.....................................................................................................
      yield lexeme
      is_first    = false
    #.......................................................................................................
    return null

  #---------------------------------------------------------------------------------------------------------
  _scan_3_merge: ( source ) ->
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
        else throw new Error "Ωilx__17 should never happen: encountered data_merge_strategy == #{rpr merged.token.data_merge_strategy}"
      yield merged
      active_fqname = null
      lexemes.length = 0
      return null
    #.......................................................................................................
    for lexeme from @_scan_4_startstop_lnr source
      if ( not lexeme.token.merge ) or ( lexeme.level.name is '$signal' )
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
  _scan_4_startstop_lnr: ( source ) ->
    prv_lexeme = null
    yield @_new_signal 'start', 0, source
    for lexeme from @_scan_4_match_tokens source
      prv_lexeme = lexeme if lexeme.level.name isnt '$signal'
      yield lexeme
    yield @_new_signal 'stop', ( prv_lexeme?.stop ? 0 ), source
    @state.lnr++
    return null

  #---------------------------------------------------------------------------------------------------------
  _scan_4_match_tokens: ( source ) ->
    start           = 0
    stack           = new Levelstack @start_level
    lexeme          = null
    old_level_name  = null
    #.......................................................................................................
    yield @_new_jump_signal 0, source, @start_level.name
    #.......................................................................................................
    loop
      level         = stack.peek()
      new_level     = level
      lexeme        = level.match_at start, source
      break unless lexeme? # terminate if current level has no matching tokens
      start         = lexeme.stop
      jump_before   = false
      jump_after    = false
      #.....................................................................................................
      if ( jump = lexeme.jump )?
        switch jump.action
          when 'fore' then  stack.push ( new_level = @_get_level jump.target )
          when 'back' then  new_level = stack.popnpeek()
          else throw new Error "Ωilx__18 should never happen: unknown jump action #{rpr lexeme.jump.action}"
        if jump.carry
          jump_before  = true
          lexeme.set_level new_level
        else
          jump_after   = true
      #.....................................................................................................
      if jump_before then yield @_new_jump_signal lexeme.start, source, lexeme.level.name
      yield lexeme if lexeme.token.emit
      if jump_after  then yield @_new_jump_signal        start, source,    new_level.name
      ### TAINT this should really check for lexeme.terminate ###
      break if lexeme.is_error
    #.......................................................................................................
    while not stack.is_empty
      stack.pop_name null
      yield @_new_jump_signal start, source, ( stack.peek_name null )
    return null

  #---------------------------------------------------------------------------------------------------------
  _get_level: ( level_name ) ->
    return R if ( R = @levels[ level_name ] )?
    throw new Error "Ωilx__19 unknown level #{rpr level_name}"


#===========================================================================================================
module.exports = {
  Token
  Lexeme
  Level
  Grammar
  internals
  rx
  new_regex_tag }

