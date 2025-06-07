(function() {
  'use strict';
  var Levelstack, clone, create_pod_from_template, debug, hide, hide_getter, info, insert_position_marker, misfit, quote_source, rpr, set_getter;

  //===========================================================================================================
  misfit = Symbol('misfit');

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
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    pop(fallback = misfit) {
      if (this.is_empty) {
        if (fallback !== misfit) {
          return fallback;
        }
        throw new Error("Ωilx__10 stack is empty");
      }
      return this.data.pop();
    }

    //---------------------------------------------------------------------------------------------------------
    peek(fallback = misfit) {
      if (this.is_empty) {
        if (fallback !== misfit) {
          return fallback;
        }
        throw new Error("Ωilx__11 stack is empty");
      }
      return this.data.at(-1);
    }

    //---------------------------------------------------------------------------------------------------------
    popnpeek(fallback = misfit) {
      if (this.is_empty) {
        if (fallback !== misfit) {
          return fallback;
        }
        throw new Error("Ωilx__12 stack is empty");
      }
      this.data.pop();
      return this.data.at(-1);
    }

    //---------------------------------------------------------------------------------------------------------
    pop_name(fallback = misfit) {
      if (this.is_empty) {
        if (fallback !== misfit) {
          return fallback;
        }
        throw new Error("Ωilx__13 stack is empty");
      }
      return this.data.pop().name;
    }

    //---------------------------------------------------------------------------------------------------------
    peek_name(fallback = misfit) {
      if (this.is_empty) {
        if (fallback !== misfit) {
          return fallback;
        }
        throw new Error("Ωilx__14 stack is empty");
      }
      return (this.data.at(-1)).name;
    }

    //---------------------------------------------------------------------------------------------------------
    popnpeek_name(fallback = misfit) {
      if (this.is_empty) {
        if (fallback !== misfit) {
          return fallback;
        }
        throw new Error("Ωilx__15 stack is empty");
      }
      this.data.pop();
      return (this.data.at(-1)).name;
    }

    //---------------------------------------------------------------------------------------------------------
    push(...P) {
      return this.data.push(...P);
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
  create_pod_from_template = function(ctx, template) {
    var R, key, ref, value;
    // ctx       = validate_optional std.pod, ctx
    template = validate(std.pod, template);
    R = Object.create(null);
    if (template != null) {
      ref = Object.getOwnPropertyDescriptors(template);
      for (key in ref) {
        ({value} = ref[key]);
        if (isa(std.function, value)) {
          value = value.call(ctx);
        }
        R[key] = value;
      }
    }
    return R;
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
  module.exports = {Levelstack, hide, hide_getter, set_getter, clone, insert_position_marker, quote_source, create_pod_from_template, debug, info, rpr};

}).call(this);

//# sourceMappingURL=helpers.js.map