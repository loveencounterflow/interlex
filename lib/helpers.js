(function() {
  'use strict';
  var Levelstack, clone, debug, hide, hide_getter, info, insert_position_marker, misfit, quote_source, rpr, set_getter;

  //===========================================================================================================
  misfit = Symbol('misfit');

  ({debug} = console);

  // stack.is_empty
  // stack.pop_name
  // stack.push
  // stack.peek
  // stack.popnpeek

    //===========================================================================================================
  Levelstack = class Levelstack {
    //---------------------------------------------------------------------------------------------------------
    constructor(...P) {
      this.data = P;
      hide_getter(this, 'length', () => {
        return this.data.length;
      });
      hide_getter(this, 'is_empty', () => {
        return this.data.length === 0;
      });
      hide(this, 'changed', []);
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    pop(fallback = misfit) {
      var R;
      if (this.is_empty) {
        if (fallback !== misfit) {
          return fallback;
        }
        throw new Error("Ωilx___2 stack is empty");
      }
      R = this.data.pop();
      this.changed.unshift(R.name);
      return R;
    }

    //---------------------------------------------------------------------------------------------------------
    peek(fallback = misfit) {
      if (this.is_empty) {
        if (fallback !== misfit) {
          return fallback;
        }
        throw new Error("Ωilx___3 stack is empty");
      }
      return this.data.at(-1);
    }

    //---------------------------------------------------------------------------------------------------------
    popnpeek(fallback = misfit) {
      if (this.is_empty) {
        if (fallback !== misfit) {
          return fallback;
        }
        throw new Error("Ωilx___4 stack is empty");
      }
      this.pop();
      return this.data.at(-1);
    }

    //---------------------------------------------------------------------------------------------------------
    pop_name(fallback = misfit) {
      if (this.is_empty) {
        if (fallback !== misfit) {
          return fallback;
        }
        throw new Error("Ωilx___5 stack is empty");
      }
      return this.pop().name;
    }

    // #---------------------------------------------------------------------------------------------------------
    // peek_name: ( fallback = misfit ) ->
    //   if @is_empty
    //     return fallback unless fallback is misfit
    //     throw new Error "Ωilx___6 stack is empty"
    //   return ( @data.at -1 ).name

      // #---------------------------------------------------------------------------------------------------------
    // popnpeek_name: ( fallback = misfit ) ->
    //   if @is_empty
    //     return fallback unless fallback is misfit
    //     throw new Error "Ωilx___7 stack is empty"
    //   @data.pop()
    //   return ( @data.at -1 ).name

      //---------------------------------------------------------------------------------------------------------
    push(d) {
      this.changed.unshift(d.name);
      this.data.push(d);
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    get_and_clear_changed() {
      var R;
      R = [...this.changed];
      this.changed.length = 0;
      return R;
    }

  };

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

  //===========================================================================================================
  clone = function(x) {
    var R;
    /* thx to https://chatgpt.com/c/68146386-600c-8005-9833-1319bd47c100 */
    // return Object.assign ( Object.create Object.getPrototypeOf x ), x
    /* improved version */
    R = Object.create(Object.getPrototypeOf(x));
    Object.defineProperties(R, Object.getOwnPropertyDescriptors(x));
    return R;
  };

  //===========================================================================================================
  insert_position_marker = function(text, idx, width = 50, marker = '⚠') {
    return text.slice(idx - width / 2, idx) + marker + text.slice(idx, +(idx + width / 2) + 1 || 9e9);
  };

  //-----------------------------------------------------------------------------------------------------------
  quote_source = function(text, idx, width = 50, marker = '⚠') {
    return `(indicated by ${rpr(marker)}: ${rpr(insert_position_marker(text, idx, width, marker))})`;
  };

  //===========================================================================================================
  // create_pod_from_template = ( ctx, template ) ->
  //   # ctx       = validate_optional std.pod, ctx
  //   template  = validate std.pod, template
  //   R = Object.create null
  //   if template?
  //     for key, { value, } of Object.getOwnPropertyDescriptors template
  //       value     = value.call ctx if isa std.function, value
  //       R[ key ]  = value
  //   return R

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
  // create_pod_from_template
  // get_instance_methods
  // bind_instance_methods
  module.exports = {Levelstack, hide, hide_getter, set_getter, clone, insert_position_marker, quote_source, debug, info, rpr};

}).call(this);

//# sourceMappingURL=helpers.js.map