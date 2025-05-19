
# InterLex


<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [InterLex](#interlex)
  - [Token Matchers](#token-matchers)
    - [`new_regex_tag()`](#new_regex_tag)
  - [To Do](#to-do)
  - [Is Done](#is-done)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->



# InterLex

## Token Matchers

### `new_regex_tag()`

* using `rx2 = new_regex_tag flags`, it's possible to produce a new RegEx tag function with a customized set
  of [*JS Regular Expression
  Flags*](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions#advanced_searching_with_flags)
* the default RegEx tag function exported by `interlex`, `rx''`, has flags `v`, `d` and `y` set
  * `v` enables advanced and improved Unicode support and overcomes some difficulties with the older `u`
    flag;
  * `d` enables indices for matched groups;
  * `y` enables 'sticky' behavior essential for a lexer.
* this leaves the user to set one or more of the following flags:
  * `g`
  * `i`
  * `m`
  * `s`
* repeating a flag is ignored, so `rx2 = new_regex_tag 'dvy'` just gives a new tag function whose behavior
  is identical to the default tag function, `rx''`
* there's no way to unset a flag

## To Do

* **`[—]`** can we replace `Level::new_token()` with a shorter API name?
* **`[—]`** allow positional arguments to `Level::new_token()`: `( name, matcher, cfg )`
* **`[—]`** bundle `start`, `stop` and later `lnr` &c under `position`?
* **`[—]`** 'wrap' tokenizing so that handling of line splitting, line numbering is isolated yet transparent
* **`[—]`** include indices for groups:

  ```
  match = 'a🈯z'.match /^(?<head>[a-z]+)(?<other>[^a-z]+)(?<tail>[a-z]+)/d
  { match.groups..., }
  { match.indices.groups..., }
  ```

* **`[—]`** rename result of `new_regex_tag` to reflect use of flags
* **`[—]`** during matching, ensure that when lexeme was produced it did consume text
  * **`[—]`** is it possible and useful to allow regular lexemes that take up zero space akin to special
    lexemes (to be written) that indicate start, end, change of level?

## Is Done

* **`[+]`** implement chunk numbering with CFG settings `{ counter_name: 'line_nr', counter_start: 1, }`
* **`[+]`** ensure that no tokens with non-sticky matchers are instantiated

<!-- ## Don't -->

