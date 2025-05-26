(function() {
  'use strict';
  var debug, hide, hide_getter, info, rpr, set_getter;

  // #===========================================================================================================
  // @bind_proto = ( that, f ) -> that::[ f.name ] = f.bind that::

  //===========================================================================================================
  hide = (object, name, value) => {
    return Object.defineProperty(object, name, {
      enumerable: false,
      writable: true,
      configurable: true,
      value: value
    });
  };

  //===========================================================================================================
  hide_getter = (object, name, getter) => {
    return Object.defineProperty(object, name, {
      enumerable: false,
      configurable: true,
      get: getter
    });
  };

  //===========================================================================================================
  set_getter = (object, name, getter) => {
    return Object.defineProperty(object, name, {
      enumerable: true,
      configurable: true,
      get: getter
    });
  };

  // #===========================================================================================================
  // get_instance_methods = ( instance ) ->
  //   isa_function  = ( require './builtins' ).std.function.$isa
  //   R             = {}
  //   for key, { value: method, } of Object.getOwnPropertyDescriptors instance
  //     continue if key is 'constructor'
  //     continue unless isa_function method
  //     R[ key ] = method
  //   return R

  // #===========================================================================================================
  // bind_instance_methods = ( instance ) ->
  //   for key, method of get_instance_methods Object.getPrototypeOf instance
  //     hide instance, key, method.bind instance
  //   return null

  //===========================================================================================================
  debug = console.debug;

  info = console.info;

  rpr = function(x) {
    return (require('loupe')).inspect(x);
  };

  //===========================================================================================================
  // get_instance_methods
  // bind_instance_methods
  module.exports = {hide, hide_getter, set_getter, debug, info, rpr};

}).call(this);

//# sourceMappingURL=helpers.js.map