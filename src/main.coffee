

'use strict'

#===========================================================================================================
{ hide
  debug
  info
  rpr                   } = require './helpers'
#-----------------------------------------------------------------------------------------------------------
### NOTE: may add punctuation later, therefore better to be restrictive ###
### thx to https://github.com/sindresorhus/identifier-regex ###
{ partial, regex, }       = require 'regex'
_jsid_re                  = regex""" ^ [ $ _ \p{ID_Start} ] [ $ _ \u200C \u200D \p{ID_Continue} ]* $ """
_jump_spec_back           = '..'
_jump_spec_re             = regex" (?<back> ^ #{_jump_spec_back} $ ) | (?<fore> #{_jsid_re} )"
# thx to https://github.com/loveencounterflow/coffeescript/commit/27e0e4cfee65ec7e1404240ccec6389b85ae9e69
_regex_flag_lower_re      = /^[dgimsuvy]$/
_regex_flag_upper_re      = /^[DGIMSUVY]$/
_regex_flags_re           = /^(?!.*(.).*\1)[dgimsuvy]*$/


#===========================================================================================================
_copy_regex = ( regex, new_flags ) ->
  flags = new Set regex.flags
  for new_flag from new_flags
    switch true
      when _regex_flag_lower_re.test new_flag then flags.add    new_flag
      when _regex_flag_upper_re.test new_flag then flags.delete new_flag.toLowerCase()
      else throw new Error "Ωilx___1 invalid regex flag #{rpr new_flag} in #{rpr new_flags}"
  return new RegExp regex.source, [ flags..., ].join ''

#===========================================================================================================
new_regex_tag = ( flags = 'dy' ) ->
  R = ( P... ) -> ( regex flags ) P...
  return new Proxy R,
    get: ( target, key ) ->
      return undefined if key is Symbol.toStringTag
      local_flags = [ ( ( new Set flags ).union new Set key )..., ].join ''
      unless _regex_flags_re.test local_flags
        throw new Error "Ωilx___2 invalid flags present in #{rpr key}"
      return ( regex local_flags )
#-----------------------------------------------------------------------------------------------------------
rx = new_regex_tag()


#===========================================================================================================
class Token

  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    @name = cfg.name
    ### TAINT use proper typing ###
    unless ( cfg.matcher instanceof RegExp )
      throw new Error "Ωilx___3 expected a regex for matcher, got #{rpr cfg.matcher}"
    unless ( cfg.matcher.sticky )
      throw new Error "Ωilx___4 expected a sticky regex for matcher, got flags #{rpr cfg.matcher.flags}"
    hide @, 'level',        cfg.level
    hide @, 'grammar',      cfg.level.grammar
    hide @, 'matcher',      cfg.matcher
    hide @, 'jump',         @constructor._parse_jump cfg.jump ? null
    hide @, 'jump_spec',    cfg.jump                          ? null
    return undefined

  #---------------------------------------------------------------------------------------------------------
  match_at: ( start, text ) ->
    @matcher.lastIndex = start
    return null unless ( match = text.match @matcher )?
    return new Lexeme @, match

  #---------------------------------------------------------------------------------------------------------
  @_parse_jump: ( jump_spec ) ->
    return null unless jump_spec?
    ### TAINT use cleartype ###
    unless ( match = jump_spec.match _jump_spec_re )?
      throw new Error "Ωilx___5 expected a well-formed jump literal, got #{rpr jump_spec}"
    return { action: 'back', target: null,              } if match.groups.back
    return { action: 'fore', target: match.groups.fore, }


#===========================================================================================================
class Lexeme

  #---------------------------------------------------------------------------------------------------------
  constructor: ( token, match ) ->
    @name       = token.name
    @fqname     = "#{token.level.name}.#{token.name}"
    @level      = token.level
    @hit        = match[ 0 ]
    @start      = match.index
    @stop       = @start + @hit.length
    @groups     = match.groups ? null
    @jump       = token.jump
    @jump_spec  = token.jump_spec
    name        = token.grammar.cfg.counter_name
    count       = token.grammar.state.count
    @[ name ]   = count
    return undefined


#===========================================================================================================
class Level

  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    cfg    ?= {}
    @name   = cfg.name ? 'gnd'
    hide @, 'grammar',  cfg.grammar
    hide @, 'tokens',   [ ( cfg.tokens ? [] )..., ]
    return undefined

  #---------------------------------------------------------------------------------------------------------
  [Symbol.iterator]: -> yield t for t in @tokens

  #---------------------------------------------------------------------------------------------------------
  new_token: ( cfg ) ->
    if cfg.level? and cfg.level isnt @
      throw new Error "Ωilx___6 inconsistent level"
    @tokens.push token = new Token { cfg..., level: @, }
    return token


#===========================================================================================================
class Stack

  #---------------------------------------------------------------------------------------------------------
  constructor: ( P... ) ->
    @data = Array.from P...
    return undefined

  #---------------------------------------------------------------------------------------------------------
  is_empty: -> @data.length is 0

  #---------------------------------------------------------------------------------------------------------
  peek: ->
    if @is_empty()
      throw new Error "stack is empty"
    return @data.at -1

  #---------------------------------------------------------------------------------------------------------
  pop: ->
    if @is_empty()
      throw new Error "stack is empty"
    return @data.pop()

  #---------------------------------------------------------------------------------------------------------
  push: ( P... ) -> @data.push P...


#===========================================================================================================
class Grammar

  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    cfg_template      =
      name:               'g'
      counter_name:       'line_nr'
      counter_value:      1
      counter_step:       1
    @cfg             ?= { cfg_template..., cfg..., }
    @state            =
      count:              @cfg.counter_value
    @name             = cfg.name
    @start_level_name = null
    hide @, 'start_level', null
    hide @, 'levels',   {}
    return undefined

  #---------------------------------------------------------------------------------------------------------
  new_level: ( cfg ) ->
    if @levels[ cfg.name ]?
      throw new Error "Ωilx___7 level #{rpr level.name} elready exists"
    level                   = new Level { cfg..., grammar: @, }
    @levels[ level.name ]   = level
    unless @start_level?
      hide @, 'start_level', level
      @start_level_name = level.name
    return level

  #---------------------------------------------------------------------------------------------------------
  get_tokens: ( P... ) -> [ ( @walk_tokens P... )..., ]

  #---------------------------------------------------------------------------------------------------------
  walk_tokens: ( source ) ->
    { f } = require '../../effstring'
    start = 0
    stack = new Stack [ @start_level, ]
    #.......................................................................................................
    loop
      lexeme  = null
      level   = stack.peek()
      for token from level
        break if ( lexeme = token.match_at start, source )?
      #.....................................................................................................
      ### Terminate if none of the tokens of the current level has matched at the current position: ###
      break unless lexeme?
      #.....................................................................................................
      yield lexeme
      @state.count += @cfg.counter_step
      start         = lexeme.stop
      #.....................................................................................................
      continue unless ( jump = lexeme.jump )?
      switch jump.action
        #...................................................................................................
        when 'fore'
          ### TAINT encapsulate ###
          unless ( new_level = @levels[ jump.target ] )?
            throw new Error "unknown level #{rpr jump.target}"
          stack.push new_level
          continue
        #...................................................................................................
        when 'back'
          stack.pop()
          continue
      #.....................................................................................................
      throw new Error "unknown jump action #{rpr lexeme.jump.action}"
    return null


  #===========================================================================================================
  ###
  `Token` defines `matcher`, can jump into a level or back
  `Level` has one or more `Token`s
  `Grammar` has one or more `Level`s
  `Lexeme` produced by a `Token` instance when matcher matches source

  ###


module.exports = {
  Token
  Lexeme
  Level
  Grammar
  regex
  rx
  new_regex_tag
  _copy_regex
  _jsid_re
  _jump_spec_re
  _regex_flag_lower_re
  _regex_flag_upper_re
  _regex_flags_re }

