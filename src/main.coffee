

'use strict'

#===========================================================================================================
{ Levelstack
  hide
  hide_getter
  set_getter
  debug
  info
  rpr                   } = require './helpers'


#===========================================================================================================
internals = new class Internals
  constructor: ->
    SLR             = require 'regex'
    #.........................................................................................................
    @Levelstack           = Levelstack
    @slevithan_regex      = SLR
    ### thx to https://github.com/sindresorhus/identifier-regex ###
    @jsid_re              = SLR.regex""" [ $ _ \p{ID_Start} ] [ $ _ \u200C \u200D \p{ID_Continue} ]* """
    @jump_spec_back       = '..'
    @jump_spec_res        = [
      { carry: false,  action: 'back', matcher: SLR.regex"^ (?<target> #{ @jump_spec_back  } )   $", }
      { carry: false,  action: 'fore', matcher: SLR.regex"^ (?<target> #{ @jsid_re         } )   $", }
      { carry: true,   action: 'back', matcher: SLR.regex"^ (?<target> #{ @jump_spec_back  } ) ! $", }
      { carry: true,   action: 'fore', matcher: SLR.regex"^ (?<target> #{ @jsid_re         } ) ! $", }
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
    @name       = cfg.name
    cfg.matcher = internals.normalize_regex cfg.matcher
    hide @, 'level',        cfg.level
    hide @, 'grammar',      cfg.level.grammar
    hide @, 'matcher',      cfg.matcher
    hide @, 'jump',         ( @constructor._parse_jump cfg.jump, @level ) ? null
    return undefined

  #---------------------------------------------------------------------------------------------------------
  match_at: ( start, source ) ->
    @matcher.lastIndex = start
    return null unless ( match = source.match @matcher )?
    return new Lexeme @, match

  #---------------------------------------------------------------------------------------------------------
  @_parse_jump: ( spec, level = null ) ->
    return null unless spec?
    match = null
    for { carry, action, matcher, } in internals.jump_spec_res
      break if ( match = spec.match matcher )?
    unless match?
      throw new Error "Ωilx___5 encountered illegal jump spec #{rpr spec}"
    { target, } = match.groups
    if level? and ( target is level.name )
      throw new Error "Ωilx___6 cannot jump to same level, got #{rpr target}"
    return { spec, carry, action, target, }


#===========================================================================================================
class Lexeme

  #---------------------------------------------------------------------------------------------------------
  constructor: ( token, match ) ->
    @name                 = token.name
    set_getter @, 'fqname', => "#{@level.name}.#{@name}"
    @hit                  = match[ 0 ]
    @start                = match.index
    @stop                 = @start + @hit.length
    @length               = @hit.length
    @groups               = match.groups ? null
    @jump                 = token.jump
    @token                = token
    @lnr                  = token.grammar.state.lnr
    @data                 = Object.create null
    #.......................................................................................................
    @set_level token.level
    hide_getter @, 'has_data',    =>
      return true for _ of @data
      return false
    #.......................................................................................................
    return undefined

  #---------------------------------------------------------------------------------------------------------
  set_level: ( level ) ->
    ### TAINT should typecheck ###
    @level = level
    return null


#===========================================================================================================
class Level

  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    cfg            ?= {}
    @name           = cfg.name ? 'gnd'
    hide @,         'grammar',  cfg.grammar
    hide @,         'tokens',   [ ( cfg.tokens ? [] )..., ]
    hide_getter @,  'strategy', => @grammar.cfg.strategy
    return undefined

  #---------------------------------------------------------------------------------------------------------
  [Symbol.iterator]: -> yield t for t in @tokens

  #---------------------------------------------------------------------------------------------------------
  new_token: ( cfg ) ->
    if cfg.level? and cfg.level isnt @
      throw new Error "Ωilx___7 inconsistent level"
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
    switch @strategy
      when 'first'    then  lexeme = @match_first_at    start, source
      when 'longest'  then  lexeme = @match_longest_at  start, source
      else throw new Error "Ωilx___8 should never happen: got strategy: #{rpr @strategy}"
    #.......................................................................................................
    ### Accept no lexeme matching but refuse lexeme with empty match: ###
    return null   unless lexeme?
    return lexeme unless ( lexeme.hit is '' ) and ( not lexeme.jump? )
    { fqname
      start } = lexeme
    snippet   = source[ start - 10 ... start ] + '⚠' + source[ start .. start + 10 ]
    throw new Error "Ωilx___9 encountered zero-length match for token #{rpr fqname} at position #{lexeme.start} (indicated by '⚠': #{rpr snippet})"


#===========================================================================================================
class Grammar

  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    cfg_template =
      name:           'g'
      strategy:       'first'
      emit_signals:   true
    #.......................................................................................................
    @cfg                   ?= { cfg_template..., cfg..., }
    @name                   = @cfg.name
    @state                  = { lnr: null, }
    @start_level_name       = null
    hide @, 'system_tokens',  null
    hide @, 'start_level',    null
    hide @, 'levels',         {}
    #.......................................................................................................
    @reset_lnr 1
    @_add_system_level()
    return undefined

  #---------------------------------------------------------------------------------------------------------
  reset_lnr: ( lnr = 1 ) ->
    @state.lnr = lnr
    return null

  #---------------------------------------------------------------------------------------------------------
  _add_system_level: ->
    $system = @new_level { name: '$system',  }
    hide @, 'system_tokens',
      start:  $system.new_token { name: 'start', matcher: /|/, }
      stop:   $system.new_token { name: 'stop',  matcher: /|/, }
      jump:   $system.new_token { name: 'jump',  matcher: /|/, }
      error:  $system.new_token { name: 'error', matcher: /|/, }
    return null

  #---------------------------------------------------------------------------------------------------------
  new_level: ( cfg ) ->
    is_system = cfg.name.startsWith '$'
    if @levels[ cfg.name ]?
      throw new Error "Ωilx__10 level #{rpr level.name} elready exists"
    level                   = new Level { cfg..., grammar: @, }
    @levels[ level.name ]   = level
    if ( not is_system ) and ( not @start_level? )
      hide @, 'start_level', level
      @start_level_name = level.name
    return level

  #---------------------------------------------------------------------------------------------------------
  get_lexemes: ( P... ) -> [ ( @walk_lexemes P... )..., ]

  #---------------------------------------------------------------------------------------------------------
  walk_lexemes: ( source ) ->
    yield from @_walk_lexemes source
    @state.lnr++
    return null

  #---------------------------------------------------------------------------------------------------------
  _walk_lexemes: ( source ) ->
    start           = 0
    stack           = new Levelstack @start_level
    lexeme          = null
    emit_signals    = @cfg.emit_signals
    old_level_name  = null
    #.......................................................................................................
    if emit_signals
      yield @system_tokens.start.match_at 0, source
      yield @_new_jump_signal 0, source, null, @start_level.name
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
          else throw new Error "Ωilx__11 should never happen: unknown jump action #{rpr lexeme.jump.action}"
        if jump.carry
          jump_before  = true if emit_signals
          lexeme.set_level new_level
        else
          jump_after   = true if emit_signals
      #.....................................................................................................
      if jump_before then yield @_new_jump_signal lexeme.start, source,        level.name, lexeme.level.name
      yield lexeme
      if jump_after  then yield @_new_jump_signal        start, source, lexeme.level.name,    new_level.name
    #.......................................................................................................
    if emit_signals
      while not stack.is_empty
        yield @_new_jump_signal start, source, ( stack.pop_name null ), ( stack.peek_name null )
      yield @system_tokens.stop.match_at start, source
    return null

  #---------------------------------------------------------------------------------------------------------
  _new_jump_signal: ( start, source, from_level, to_level ) ->
    R                  = @system_tokens.jump.match_at start, source
    R.data.from_level  = from_level
    R.data.to_level    = to_level
    return R

  #---------------------------------------------------------------------------------------------------------
  _get_level: ( level_name ) ->
    return R if ( R = @levels[ level_name ] )?
    throw new Error "Ωilx__12 unknown level #{rpr level_name}"


#===========================================================================================================
module.exports = {
  Token
  Lexeme
  Level
  Grammar
  internals
  rx
  new_regex_tag }

