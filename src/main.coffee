

'use strict'

#===========================================================================================================
{ hide
  get_instance_methods
  bind_instance_methods
  debug
  info
  rpr                   } = require './helpers'
#-----------------------------------------------------------------------------------------------------------
{ partial, regex, }       = require 'regex'
rx                        = regex 'y'
#-----------------------------------------------------------------------------------------------------------
### NOTE: may add punctuation later, therefore better to be restrictive ###
### thx to https://github.com/sindresorhus/identifier-regex ###
_jsid_re                  = regex""" ^ [ $ _ \p{ID_Start} ] [ $ _ \u200C \u200D \p{ID_Continue} ]* $ """
_jump_spec_back           = '..'
_jump_spec_re             = regex" (?<back> ^ #{_jump_spec_back} $ ) | (?<fore> #{_jsid_re} )"


#===========================================================================================================
class Token

  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    debug 'Ω___1', "new Token", cfg.name, cfg.level, cfg.level.grammar
    @name = cfg.name
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
      throw new Error "Ω___2 expected a well-formed jump literal, got #{rpr jump_spec}"
    return { action: 'back', target: null,              } if match.groups.back
    return { action: 'fore', target: match.groups.fore, }


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
    @jump_spec = token.jump_spec
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
        jump_spec
        groups  } = lexeme
      groups_rpr  = if groups?  then ( rpr { groups..., } ) else ''
      jump_rpr    = jump_spec ? ''
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
  _jsid_re
  _jump_spec_re }

