

'use strict'

#===========================================================================================================
{ hide
  hide_getter
  debug
  info
  rpr                   } = require './helpers'
#-----------------------------------------------------------------------------------------------------------


#===========================================================================================================
internals = new class Internals
  constructor: ->
    SLR             = require 'regex'
    #.........................................................................................................
    ### thx to https://github.com/sindresorhus/identifier-regex ###
    jsid_re         = SLR.regex""" ^ [ $ _ \p{ID_Start} ] [ $ _ \u200C \u200D \p{ID_Continue} ]* $ """
    jump_spec_back  = '..'
    jump_spec_re    = SLR.regex" (?<back> ^ #{jump_spec_back} $ ) | (?<fore> #{jsid_re} )"
    #.........................................................................................................
    @slevithan_regex      = SLR
    @jsid_re              = jsid_re
    @jump_spec_back       = jump_spec_back
    @jump_spec_re         = jump_spec_re
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
    hide @, 'jump_spec',    ( cfg.jump                                  ) ? null
    return undefined

  #---------------------------------------------------------------------------------------------------------
  match_at: ( start, source ) ->
    @matcher.lastIndex = start
    return null unless ( match = source.match @matcher )?
    return new Lexeme @, match

  #---------------------------------------------------------------------------------------------------------
  @_parse_jump: ( jump_spec, level = null ) ->
    return null unless jump_spec?
    ### TAINT use cleartype ###
    unless ( match = jump_spec.match internals.jump_spec_re )?
      throw new Error "Ωilx___5 expected a well-formed jump literal, got #{rpr jump_spec}"
    return { action: 'back', target: null,              } if match.groups.back
    target = match.groups.fore
    if level? and ( target is level.name )
      throw new Error "Ωilx___6 cannot jump to same level, got #{rpr target}"
    return { action: 'fore', target, }


#===========================================================================================================
class Lexeme

  #---------------------------------------------------------------------------------------------------------
  constructor: ( token, match ) ->
    @name                         = token.name
    @fqname                       = "#{token.level.name}.#{token.name}"
    @level                        = token.level
    @hit                          = match[ 0 ]
    @start                        = match.index
    @stop                         = @start + @hit.length
    @length                       = @hit.length
    @groups                       = match.groups ? null
    @jump                         = token.jump
    @jump_spec                    = token.jump_spec
    grammar                       = token.grammar
    @[ grammar.cfg.counter_name ] = grammar.state.count
    return undefined


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
    return lexeme unless lexeme.hit is ''
    { fqname
      start } = lexeme
    snippet   = source[ start - 10 ... start ] + '⚠' + source[ start .. start + 10 ]
    throw new Error "Ωilx___9 encountered zero-length match for token #{rpr fqname} at position #{lexeme.start} (indicated by '⚠': #{rpr snippet})"


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
    cfg_template          =
      name:                 'g'
      counter_name:         'line_nr'
      counter_value:        1
      counter_step:         1
      strategy:             'first'
    @cfg                 ?= { cfg_template..., cfg..., }
    @name                 = @cfg.name
    @state                = { count: null, }
    @reset_count()
    @start_level_name     = null
    hide @, 'start_level',  null
    hide @, 'levels',       {}
    return undefined

  #---------------------------------------------------------------------------------------------------------
  reset_count: ->
    @state.count = @cfg.counter_value
    return null

  #---------------------------------------------------------------------------------------------------------
  new_level: ( cfg ) ->
    if @levels[ cfg.name ]?
      throw new Error "Ωilx__10 level #{rpr level.name} elready exists"
    level                   = new Level { cfg..., grammar: @, }
    @levels[ level.name ]   = level
    unless @start_level?
      hide @, 'start_level', level
      @start_level_name = level.name
    return level

  #---------------------------------------------------------------------------------------------------------
  get_lexemes: ( P... ) -> [ ( @walk_lexemes P... )..., ]

  #---------------------------------------------------------------------------------------------------------
  walk_lexemes: ( source ) ->
    { f } = require '../../effstring'
    start = 0
    stack = new Stack [ @start_level, ]
    #.......................................................................................................
    loop
      lexeme  = null
      level   = stack.peek()
      lexeme  = level.match_at start, source
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
  internals
  rx
  new_regex_tag }

