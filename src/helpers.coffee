
'use strict'

#===========================================================================================================
misfit                    = Symbol 'misfit'

#===========================================================================================================
class Levelstack

  #---------------------------------------------------------------------------------------------------------
  constructor: ( P... ) ->
    @data = P
    hide_getter @, 'length',    => @data.length
    hide_getter @, 'is_empty',  => @data.length is 0
    return undefined

  #---------------------------------------------------------------------------------------------------------
  pop: ( fallback = misfit ) ->
    if @is_empty
      return fallback unless fallback is misfit
      throw new Error "Ωilx__10 stack is empty"
    return @data.pop()

  #---------------------------------------------------------------------------------------------------------
  peek: ( fallback = misfit ) ->
    if @is_empty
      return fallback unless fallback is misfit
      throw new Error "Ωilx__11 stack is empty"
    return @data.at -1

  #---------------------------------------------------------------------------------------------------------
  popnpeek: ( fallback = misfit ) ->
    if @is_empty
      return fallback unless fallback is misfit
      throw new Error "Ωilx__12 stack is empty"
    @data.pop()
    return @data.at -1

  #---------------------------------------------------------------------------------------------------------
  pop_name: ( fallback = misfit ) ->
    if @is_empty
      return fallback unless fallback is misfit
      throw new Error "Ωilx__13 stack is empty"
    return @data.pop().name

  #---------------------------------------------------------------------------------------------------------
  peek_name: ( fallback = misfit ) ->
    if @is_empty
      return fallback unless fallback is misfit
      throw new Error "Ωilx__14 stack is empty"
    return ( @data.at -1 ).name

  #---------------------------------------------------------------------------------------------------------
  popnpeek_name: ( fallback = misfit ) ->
    if @is_empty
      return fallback unless fallback is misfit
      throw new Error "Ωilx__15 stack is empty"
    @data.pop()
    return ( @data.at -1 ).name

  #---------------------------------------------------------------------------------------------------------
  push: ( P... ) -> @data.push P...


# #===========================================================================================================
# @bind_proto = ( that, f ) -> that::[ f.name ] = f.bind that::

#===========================================================================================================
hide = ( object, name, value ) => Object.defineProperty object, name,
    enumerable:   false
    writable:     true
    configurable: true
    value:        value

#===========================================================================================================
hide_getter = ( object, name, getter ) => Object.defineProperty object, name,
    enumerable:   false
    configurable: true
    get:          getter

#===========================================================================================================
set_getter = ( object, name, getter ) => Object.defineProperty object, name,
    enumerable:   true
    configurable: true
    get:          getter

#===========================================================================================================
clone = ( x ) ->
  ### thx to https://chatgpt.com/c/68146386-600c-8005-9833-1319bd47c100 ###
  # return Object.assign ( Object.create Object.getPrototypeOf x ), x
  ### improved version ###
  R = Object.create Object.getPrototypeOf x
  Object.defineProperties R, Object.getOwnPropertyDescriptors x
  return R

#===========================================================================================================
insert_position_marker = ( text, idx, width = 50, marker = '⚠' ) ->
  return text[ idx - width / 2 ... idx ] + marker + text[ idx .. idx + width / 2  ]

#-----------------------------------------------------------------------------------------------------------
quote_source = ( text, idx, width = 50, marker = '⚠' ) ->
  return "(indicated by #{rpr marker}: #{rpr insert_position_marker text, idx, width, marker})"

# #===========================================================================================================
# get_instance_methods = ( instance ) ->
#   isa_function  = ( require './builtins' ).std.function.$isa
#   R             = {}
#   for key, { value: method, } of Object.getOwnPropertyDescriptors instance
#     continue if key is 'constructor'
#     continue unless isa_function method
#     R[ key ] = method
#   return R

# #===========================================================================================================
# bind_instance_methods = ( instance ) ->
#   for key, method of get_instance_methods Object.getPrototypeOf instance
#     hide instance, key, method.bind instance
#   return null

#===========================================================================================================
debug   = console.debug
info    = console.info
rpr     = ( x ) -> ( require 'loupe' ).inspect x

#===========================================================================================================
module.exports = {
  Levelstack
  hide
  hide_getter
  set_getter
  clone
  insert_position_marker
  quote_source
  # get_instance_methods
  # bind_instance_methods
  debug
  info
  rpr }
