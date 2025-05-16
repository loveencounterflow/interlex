

'use strict'

{ hide
  get_instance_methods
  bind_instance_methods
  debug
  info
  rpr                   } = require './helpers'


{ partial, regex, } = require 'regex'
# hide  = ( owner, name, value ) -> Object.defineProperty owner, name, { enumerable: false, value, writable: true, }
rx    = regex 'y'

#===========================================================================================================
_jump_literal_re = regex"""
  ^(
  \[ (?<exclusive_jump> [^ \^ . \s \[ \] ]+ )     |
     (?<inclusive_jump> [^ \^ . \s \[ \] ]+ ) \[  |
  \] (?<exclusive_back> [     .          ]  )     |
     (?<inclusive_back> [     .          ]  ) \]
  )$ """

#===========================================================================================================
class Token

  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    debug 'Ω___1', "new Token", cfg.name, cfg.level, cfg.level.grammar
    @name = cfg.name
    hide @, 'level',        cfg.level
    hide @, 'grammar',      cfg.level.grammar
    hide @, 'matcher',      cfg.matcher
    hide @, 'jump',         @parse_jump cfg.jump  ? null
    hide @, 'jump_literal', cfg.jump              ? null
    return undefined

  #---------------------------------------------------------------------------------------------------------
  match_at: ( start, text ) ->
    @matcher.lastIndex = start
    return null unless ( match = text.match @matcher )?
    return new Lexeme @, match

  #---------------------------------------------------------------------------------------------------------
  parse_jump: ( jump_literal ) ->
    return null unless jump_literal?
    ### TAINT use cleartype ###
    unless ( match = jump_literal.match _jump_literal_re )?
      throw new Error "Ω___2 expected a well-formed jump literal, got #{rpr jump_literal}"
    for key, level_name of match.groups
      continue unless level_name?
      [ affinity, action, ] = key.split '_'
      break
    if level_name is '.'
      level = level_name
    else unless ( level = @grammar.levels[ level_name ] )?
      throw new Error "Ω___3 expected name of a known level, got #{rpr level_name}"
    return { affinity, action, level, }


#===========================================================================================================
class Lexeme

  #---------------------------------------------------------------------------------------------------------
  constructor: ( token, match ) ->
    # debug 'Ω___4', token
    # debug 'Ω___5', token.jump, token.grammar.levels[ token.jump.level ] if token.jump?
    @name         = token.name
    @fqname       = "#{token.level.name}.#{token.name}"
    @level        = token.level
    @hit          = match[ 0 ]
    @start        = match.index
    @stop         = @start + @hit.length
    @groups       = match.groups ? null
    @jump         = token.jump
    @jump_literal = token.jump_literal
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
      throw new Error "Ω___6 inconsistent level"
    @tokens.push token = new Token { cfg..., level: @, }
    return token

#===========================================================================================================
class Grammar

  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    cfg              ?= {}
    @name             = cfg.name ? 'g'
    @start_name       = null
    hide @, 'start',    null
    hide @, 'levels',   { ( cfg.levels ? {} )..., }
    return undefined

  #---------------------------------------------------------------------------------------------------------
  new_level: ( cfg ) ->
    if @levels[ cfg.name ]?
      throw new Error "Ω___7 level #{rpr level.name} elready exists"
    level                   = new Level { cfg..., grammar: @, }
    @levels[ level.name ]   = level
    @start                 ?= level
    @start_name            ?= level.name
    return level

  #---------------------------------------------------------------------------------------------------------
  tokenize: ( source ) ->
    { f } = require '../../effstring'
    start   = 0
    info 'Ω___8', rpr source
    level   = @start
    loop
      lexeme  = null
      for token from @levels.gnd
        break if ( lexeme = token.match_at start, source )?
      break unless lexeme?
      { name
        fqname
        stop
        hit
        jump
        jump_literal
        groups  } = lexeme
      groups_rpr  = if groups?  then ( rpr { groups..., } ) else ''
      jump_rpr    = jump_literal ? ''
      info 'Ω___9', f"#{start}:>3.0f;:#{stop}:<3.0f; #{fqname}:<20c; #{rpr hit}:<30c; #{jump_rpr}:<15c; #{groups_rpr}"
      start     = stop
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
  rx
  _jump_literal_re }

