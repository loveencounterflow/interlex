
# InterLex


<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [InterLex](#interlex)
  - [Token Matchers](#token-matchers)
    - [Zero-Length Matches](#zero-length-matches)
  - [Token Jumps](#token-jumps)
  - [Using the `interlex.rx''` Regex Tag Function](#using-the-interlexrx-regex-tag-function)
    - [Producing a Regex Tag Function with `new_regex_tag()`](#producing-a-regex-tag-function-with-new_regex_tag)
  - [To Do](#to-do)
  - [Is Done](#is-done)
  - [Don't](#dont)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->



# InterLex

## Token Matchers


Token matchers should preferrably constructed using the InterLex `rx''` regex tag function, but one can also
use plain JS RegEx literals. All regular expressions will be silently 'upgraded' by [removing illegal and
adding necessary flags](#producing-a-regex-tag-function-with-new_regex_tag), so for example declaring `{
matcher: /A[a-z]+/, }` will actually result in the regular expression `/A[a-z]+/dvy` to be used.

Note that in order to use some features of 3rd gen Unicode support afforded by the `v` flag one will need to
explicitly set that flag on regex literals to make the JS parser accept the JS source file, but for many use
cases just using a 'naked' regex literal should be fine—although those who do so will miss out on the many
finer points of using [`slevithan/regex`](https://github.com/slevithan/regex).

### Zero-Length Matches

* also called 'empty matches'
* are only rejected when they actually happen to occur while scanning a text because it is not feasable
  (at this point at least) to recognize all possible empty matches by static analysis of regular expressions
* empty matches are allowed only when the respective token has a declared jump; in that scenario, empty
  matches are typically the result of a matcher with a regex lookahead; for example one could declare a
  token `{ name: 'before_digits', matcher: /(?=[0-9])/, jump: 'number', }` that instructs the lexer to jump
  to level `number` right before `(?=` a digit `[0-9]`; in that other level `number`, another token declared
  as `{ name: 'digits', matcher: /[0-9]+/i, }` can then pick up right on the same spot. Without the empty
  match and lookaheads, one would inevitably wind up with the stretch of digits split up between two lexemes
  that might even belong to two different levels.

## Token Jumps

* Jumps are declared with the property name `jump` and a so-called 'jump spec' which is a string that
  contains **(1)**&nbsp;either **(a)**&nbsp;another level's name, or **(b)**&nbsp;a symbolic string `..` to
  indicate 'jump back from current level, return to the previous level'; and **(2)**&nbsp;an optional 'carry
  mark'.
* Jumps can be either 'sticky' or 'carrying' depending on whether the lexeme produced from the respective
  token will 'stick' to the token's level or be 'carried' along to the new level (the jump's target). Sticky
  jumps have no explicit marker as they represent the 'default of least surprise' (a lexeme looks almost
  like the token it was produced by, after all); carrying jumps are indicated by an `!` exclamation mark
  behind the jump target, so for example a token declaration in level `gnd` that contains `{ jump:
  'otherlevel!', }` indicates that the resulting lexeme's `level` will be `otherlevel`, not `gnd`."


## Using the `interlex.rx''` Regex Tag Function

The InterLex `rx''` regex tag function is based on the `regex''` tag function from
[`slevithan/regex`](https://github.com/slevithan/regex). It is intended to be used mainly to define a
`matcher` for InterLex `Token`s, allows to convert a string into a regular expression object with
* `rx"[abc]+"` (CoffeeScript) or
* ```rx`[abc]+`‍``` (JavaScript).

Either of the above results in the regular expression `/[abc]+/dvy` with the `d`, `v` and `y` flags
implicitly set, for which see below.

In contradistinction to the original `regex''` tag function provided by `slevithan/regex`, the `rx''` tag
function offers the capability to set additional flags by using JS dotted accessor syntax, which is a fancy
way to say that when e.g. you have a matcher `rx"[abc]"` to match any of the letters `'a'`, `'b'`, `'c'` in
a given source, then in order to set the case-**i**nsensitivy flag `i` you can write `rx.i"[abc]"` to match
any of `'a'`, `'b'`, `'c'`, `'A'`, `'B'`, or `'C'`.


### Producing a Regex Tag Function with `new_regex_tag()`


Using `rx2 = new_regex_tag flags`, it's possible to produce a new regex tag function with a customized set
of [*JS Regular Expression
Flags*](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions#advanced_searching_with_flags)
The default regex tag function exported by `interlex`, `rx''`, inherits [extended support for flags and
features some additional implicitly-set
flags](https://github.com/slevithan/regex?tab=readme-ov-file#-flags):

* The **`x` flag is always implicitly set**; it (quote) "makes whitespace insignificant and adds support for
  line comments (starting with `#`), allowing you to freely format your regexes for readability"; this flag
  is emulated by `slevithan/regex`.
* The **`v` flag is always implicitly set**; it enables advanced and improved Unicode support and
  overcomes some difficulties with the older `u` flag;
* **The `u` flag is always implicitly excluded** by the implicit, always-on presence of `v`.
* **The `d` flag is always implicitly set**; it enables indices for matched groups.
* **The `y` flag is always implicitly set**; it enables 'sticky' behavior essential for a lexer.
* this leaves the user to set one or more of the following flags:
  * `g`
  * `i`
  * `m`
  * `s`
* Repeated flags are ignored, so `rx2 = new_regex_tag 'dvy'` just gives a new tag function whose behavior is
  identical to the default tag function, `rx''`, and, say, `new_regex_tag 'iiiii'` is no different from
  `new_regex_tag 'i'`. There's no way to unset a flag.

## To Do

* **`[—]`** can we replace `Level::new_token()` with a shorter API name?
  * **`[—]`** allow to declare tokens when calling `Level::new_token()`
* **`[—]`** allow positional arguments to `Level::new_token()`: `( name, matcher, cfg )`
* **`[—]`** bundle `start`, `stop` and later `lnr` &c under `position`?
* **`[—]`** include indices for groups:

  ```
  match = 'a🈯z'.match /^(?<head>[a-z]+)(?<other>[^a-z]+)(?<tail>[a-z]+)/d
  { match.groups..., }
  { match.indices.groups..., }
  ```

* **`[—]`** rename result of `new_regex_tag` to reflect use of flags
* **`[—]`** allow functions for `token.matcher`?
  * must accept `( start, text, { token, level, grammar, } )`
  * must return `null` or a lexeme
* **`[—]`** allow string for `token.matcher`?
* **`[—]`** these internal settings / convenience values should be systematized and maybe collected in a
  common place; some of the regex flag values can and should be derived from more basic settings:
  * `_jsid_re`
  * `_jump_spec_back`
  * `_jump_spec_re`
  * `_regex_flag_lower_re`
  * `_regex_flag_upper_re`
  * `_regex_flags_re`
  * `_default_flags_set`
  * `_disallowed_flags_set`
  * `_normalize_new_flags`

* **`[—]`** allow different metrics (code units, code points, graphemes) to determine `lexeme.length`, which
  lexeme gets returned for `Level::match_longest_at()`
* **`[—]`** move `fqname` formation to token, use API
* **`[—]`** implement API to test whether lexing has finished
  * **`[—]`** option to throw or emit error in case lexing is unfinished
* **`[—]`** allow empty matches provided the token defines a jump
* **`[—]`** documentation:
  > * `Token` defines `matcher`, can jump into a level or back
  > * `Level` has one or more `Token`s
  > * `Grammar` has one or more `Level`s
  > * `Lexeme` produced by a `Token` instance when matcher matches source
* **`[—]`** implement `discardable`, `ghost` tokens, especially for zero-length jumpers?



## Is Done

* **`[+]`** implement chunk numbering with CFG settings `{ counter_name: 'line_nr', counter_start: 1, }`
* **`[+]`** ensure that no tokens with non-sticky matchers are instantiated
* **`[+]`** when using regex for `token.matcher`, should we **(1)** update flags or **(2)** reject regexes
  without required flags?—See what `slevithan/regex` does with `v` flag (throws `Error: Implicit flags
  v/u/x/n cannot be explicitly added`)
* **`[+]`** during matching, ensure that when lexeme was produced it did consume text
* **`[+]`** extend sanity checks for matcher regex:
  * **`[+]`** must not have `g`?
  * **`[+]`** must have `d`
  * **`[+]`** must have `v` not `u`?
* **`[+]`** is it possible and useful to allow regular lexemes that take up zero space akin to special
  lexemes (to be written) that indicate start, end, change of level?
* **`[+]`** documentation:
  > emtpy matches are allowed only as intermediate results (with strategy `longest)` or when the respective
  > token declares a jump". **Note** disallowing empty jumps in internal, intermediate results is somewhat
  > misleading because it, too, does not by any means catch all cases where any of the declared matches
  > could have conceivably remained empty. Which is to say we should either confine ourselves to doing
  > runtime sanity checks (soemthing we can certainly do, with ease) and accept that we have no way to
  > discover matchers that could *potentially* return empty matches; or, else, we implement watertight
  > up-front checks that only reguler expressions that can never yield an empty match are allowable
  > (something we can almost certainly not do, like at all). Conceptually, no matter the acceptance strategy
  > (`first` or `longest`), there are always some matchers that could have matched a zero-length string
  > (which we cannot know for sure unless we use some non-existing static analysis technique) but that were
  > either not applied (because some other token's matcher came earlier) or applied and discarded (because
  > some other token's matcher gave a longer match).
* **`[+]`** documentation:
  > jumps can be either 'sticky' or 'carrying' depending on whether the lexeme produced from the respective
  > token will 'stick' to the token's level or be 'carried' along to the new level (the jump's target).
  > Sticky jumps have no explicit marker as they represent the 'default of least surprise' (a lexeme looks
  > almost like the token it was produced by, after all); carrying jumps are indicated by an `!` exclamation
  > mark behind the jump target, so for example a token declaration in level `gnd` that contains `{ jump:
  > 'otherlevel!', }` indicates that the resulting lexeme's `level` will be `otherlevel`, not `gnd`."
* **`[+]`** lexemes now contain both `lx.jump.jump_spec` and `lx.jump_spec` (in addition to
  `lx.token.jump.jump_spec`); it should conceivably only be `lx.jump.spec`
* **`[+]`** implement setting to simplify jumps such that any series of jumps starting with `from_level:
  'a'` and ending with `to_level: b` without any intervening non-`jump` signals are simplified to a single
  `jump` from `a` to `b`
* **`[+]`** rename `$system` to `$signal`
* **`[+]`** aggregate CFG settings such that the resulting version has the final results; e.g. a
  constellation of `{ emit_signals: false, simplify_jumps: true, }` can be aggregated as `{ emit_signals:
  false, simplify_jumps: false, }`

## Don't

* **`[—]`** <del>'wrap' tokenizing so that handling of line splitting, line numbering is isolated yet
  transparent</del>
* **`[—]`** <del>use syntax as before (`[level`, `..]` vs `level[`, `]..`)</del>
* **`[—]`** <del>implement 'inclusive' ('progressive'), 'exclusive' ('regressive') jumps</del>
  * **`[—]`** <del>allow to configure grammar defaults for fore- and backward jumps</del>

