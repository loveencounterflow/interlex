
# InterLex


<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [InterLex](#interlex)
  - [Grammar API](#grammar-api)
  - [Token Declarations](#token-declarations)
  - [Token Matchers](#token-matchers)
    - [Zero-Length Matches](#zero-length-matches)
    - [Using the `interlex.rx''` Regex Tag Function](#using-the-interlexrx-regex-tag-function)
    - [Producing a Regex Tag Function with `new_regex_tag()`](#producing-a-regex-tag-function-with-new_regex_tag)
  - [Token Jumps](#token-jumps)
  - [To Be Written](#to-be-written)
    - [Overview](#overview)
    - [Five Scanner Constraints](#five-scanner-constraints)
    - [Signals: Implementation Note](#signals-implementation-note)
    - [Errors Always Emitted](#errors-always-emitted)
    - [Do Not Use Star Quantifiers](#do-not-use-star-quantifiers)
    - [Always Unicode, Except](#always-unicode-except)
    - [Errors as Exceptions or Signals](#errors-as-exceptions-or-signals)
    - [Lexeme Status Properties](#lexeme-status-properties)
    - [Data Absorption, Data Reset](#data-absorption-data-reset)
  - [To Do](#to-do)
  - [Is Done](#is-done)
  - [Don't](#dont)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->



# InterLex


## Grammar API

* **`Grammar::scan: ( source ) ->`**: Iterate over all lexemes that result from matching tokens against the
  `source` text.
* **`Grammar::scan_to_list: ( source ) ->`**: Same as `Grammar::scan()` but returns a list of lexemes
  instead of a generator.
* **`Grammar::scan_first: ( source ) ->`**: Iterates over lexemes yielded by `Grammar::scan source` until it
  encounters the first non-signal lexeme and returns that lexeme. Handy for testing token matchers.

## Token Declarations

* **`name`** (`null`): Must be a string giving the name of the token. Names must be unique to the level.
* **`level`** (set by `Level.new_token()`):
* **`grammar`** (set by `Level.new_token()`):
* **`fit`** (`null`): What to match at the current position of the source; see [Token
  Matchers](#token-matchers).
* **`jump`** (`null`): Which level to jump to when token matches; see [Token Jumps](#token-jumps).
* **`emit`** (`true`): When set to `false`, lexemes produced by the token will not be emitted; this os
  intended to be used mainly with zero-length-matching jump tokens that don't consume any text and are only
  there to start or finish a given level, something that will also be indicated by jump signals. Tokens that
  are declared with `{ emit: false, }` are called 'ghost' tokens.
* **`merge`** (`false`):
  * When set to `true`, will merge contiguous lexemes resulting from this token into a single one. Simplest
    example: a token declared as `{ name: 'number', fit: /[0-9]/, }` will match single Arabic digits, so
    `Grammar::scan_first '953'` will return a lexeme `{ name: 'number', hit: '9', }`. With `{ ..., merge:
    true, }`, though, the same `Grammar::scan_first '953'` will now return a lexeme `{ name: 'number', hit:
    '953', }` because the contiguous stretch of digits will be merged into a single lexeme.
  * Other than `true` or `false`, one can also explicitly declare the data merge strategy to be used:
    * When set to `list`, will turn all values in the `data` property of each merged lexeme into a list of
      values; this is also the default strategy used for `merge: true`.
    * When set to `assign`, will use `Object.assign()` to set key / value pairs from all the merged lexemes
      in the order of their appearance; this should be faster than `merge: 'list'` but also means that only
      the last occurrences of each named data item will be preserved in the merged lexeme.
    * When `merge` is set to a function, that function will be called with an object `{ merged, lexemes, }`
      where `merge` is a clone (independent copy) of the first matched lexeme and `lexemes` is a list of all
      matched lexemes; inside the function, one can manipulate `merged.data` to one's liking. Observe that
      `merged.hit` will already be set to the concatenation of all lexeme `hit`s and `merged.stop` has been
      set to the last match's `stop` property.

## Token Matchers

Token matchers—defined using the `fit` key in token declarations—should preferrably constructed using the
InterLex `rx''` regex tag function, but one can also use plain JS RegEx literals. All regular expressions
will be silently 'upgraded' by [removing illegal and adding necessary
flags](#producing-a-regex-tag-function-with-new_regex_tag), so for example declaring `{ fit: /A[a-z]+/, }`
will actually result in the regular expression `/A[a-z]+/dvy` to be used.

Note that in order to use some features of 3rd gen Unicode support afforded by the `v` flag one will need to
explicitly set that flag on regex literals to make the JS parser accept the JS source file, but for many use
cases just using a 'naked' regex literal should be fine—although those who do so will miss out on the many
finer points of using [`slevithan/regex`](https://github.com/slevithan/regex).

### Zero-Length Matches

* also called 'empty matches'
* are only rejected when they actually happen to occur while scanning a text because it is not feasable
  (at this point at least) to recognize all possible empty matches by static analysis of regular expressions
* empty matches are allowed only when the respective token has a declared jump; in that scenario, empty
  matches are typically the result of a `fit` with a regex lookahead; for example one could declare a
  token `{ name: 'before_digits', fit: /(?=[0-9])/, jump: 'number', }` that instructs the lexer to jump
  to level `number` right before `(?=` a digit `[0-9]`; in that other level `number`, another token declared
  as `{ name: 'digits', fit: /[0-9]+/i, }` can then pick up right on the same spot. Without the empty
  match and lookaheads, one would inevitably wind up with the stretch of digits split up between two lexemes
  that might even belong to two different levels.


### Using the `interlex.rx''` Regex Tag Function

The InterLex `rx''` regex tag function is based on the `regex''` tag function from
[`slevithan/regex`](https://github.com/slevithan/regex). It is intended to be used mainly to define a
`fit` for InterLex `Token`s, allows to convert a string into a regular expression object with
* `rx"[abc]+"` (CoffeeScript) or
* ```rx`[abc]+`‍``` (JavaScript).

Either of the above results in the regular expression `/[abc]+/dvy` with the `d`, `v` and `y` flags
implicitly set, for which see below.

In contradistinction to the original `regex''` tag function provided by `slevithan/regex`, the `rx''` tag
function offers the capability to set additional flags by using JS dotted accessor syntax, which is a fancy
way to say that when e.g. you have `fit: rx"[abc]"` to match any of the letters `'a'`, `'b'`, `'c'` in
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

## To Be Written

### Overview

* `Grammar` has one or more `Level`s.
* `Level` has one or more `Token`s.
* `Token` defines `fit`, can jump into a level or back.
* `Lexeme`s are produced by a `Token` when `Token::fit` matches the source text at the current position.
* `Token`s have `fit`s, `Lexeme`s have `hit`s; `fit`s produce `hit`s.
* `fit`s are also called 'matchers', `hit`s are also called 'matches'.

### Five Scanner Constraints

All scans must be **exhaustive**, **compact**, **contiguous**, **bijective** and **monotonous**, meaning:

* **Exhaustive** (a.k.a. "no leftovers"): each position in a source from the first to the last codepoint
  must be covered by some lexeme; more specifically—because dense coverage already falls out from the
  requirements of compactness and contiguity—the first (non-signal) lexeme must cover the source position
  with index `0`, and the last (non-signal) lexeme must cover the source position with index
  `source.length - 1` (a.k.a. `source.at -1`).

* **Compact** (a.k.a. "no gaps"): excluding the first and the last lexeme in a given scan, for each lexeme
  `kₙ` there must be a directly preceding lexeme `kₙ₋₁` that covers the codepoint at `kₙ.start - 1` and
  another directly following lexeme `kₙ₊₁` that covers the codepoint at `l.stop`.

* **Contiguous** (a.k.a. "no scatter"): each lexeme represents a single part (called the `Lexeme::hit`) of
  the source; it's not possible for a single lexeme to cover one part of the source here and another,
  separate part of the source over there.

* **Bijective** (a.k.a. "one on one"): after an errorless scan, each codepoint of the source will be
  associated with exactly one lexeme; no codepoint can belong to two or more lexemes at any time (although
  when using zero-length matchers, the spaces *between* codeints that come right before and after a given
  lexeme may belong to other lexemes).

* **Monotonous** (a.k.a. "no going back"):
  * the `start` positions of all lexemes will be emitted in a monotonously increasing order, meaning
    that for all consecutive lexemes `kₙ`, `kₙ₊₁` it must hold that `kₙ.start < kₙ₊₁.start`.
  * This condition is loosened to `kₙ.start ≤ kₙ₊₁.start` for tokens that declare a jump to another level;
    these and only jump tokens are allowed to match the empty string. This means jump tokens can be
    formulated as regex lookaheads; non-jump tokens can of course do lookaheads, too, but they must also
    advance the current position of the scan.
  * From the above (and under the assumption that neither the tokens nor the source will be modified during
    a scan, except for state) there follows a "no two visits" corollary: for any given source text, each
    level of a correctly constructed lexer will only be asked to match a given position in the source up to
    one time—otherwise the lexer would return the same sequence of lexemes over and over again without ever
    stopping.

Together these principles impose strong constraints on what a well-formed scan can be and lead to some
practically interesting invariants; for example, the concatenation of all `Lexeme::hit`s from all lexemes
(and signals) resulting from a scan of a given `source` are equal to the source, i.e. `source == [ ( hit
for hit from Grammar.scan source )..., ].join ''`

The grammar is required to / will emit error signals in all situations where any of the above constraints
is violated.

### Signals: Implementation Note

Signals are just lexemes emitted by the scanner (i.e. the grammar). Internally they are formed the same
way that user lexemes are formed (namely from a token, a source, and a position); they have the same
fields as user lexemes, and can for many purposes run through the same processing pipeline as user
lexemes.

### Errors Always Emitted

Even with `Grammar::cfg.emit_signals` set to `false`, `Grammar::scan()` will still emit error signals; only
`start`, `stop` and `jump` signals will be suppressed.

### Do Not Use Star Quantifiers

do not use star quantifier(?) in regexes unless you know what you're doing; ex. `/[a-z]*/` will match even
without there being any ASCII letters

### Always Unicode, Except

* Since all regex matchers (regex `fit`s) have the `v` flag set, `fit: /./` will always match Unicode
  code**points** (not Unicode code **units**);
* however, JavaScript string indices continue to index Unicode code **units** (not Unicode code**points**);
* hence, `Lexeme::start`, `::stop`, `::length` and `::pos` all index the source in terms of Unicode code
  **units** although the matches (`hit`s) are constructed by looking at Unicode code**points**.
* Yes, this is annoying.

### Errors as Exceptions or Signals

* errors are either thrown as JS exceptions or error signals
* error signals are defined in a system levwl called `$error`
* implemented
  * `$error.loop`, emitted when a grammar tries to scan a portion of a source more than once
  * `$error.earlystop`, emitted when scanning has stopped but end of source not reached
  * `Grammar.cfg.loop_errors: {'emit'|'throw'}` controls whether to emit `$error.loop` or throw an exception

### Lexeme Status Properties

* **`Lexeme::is_system`**: true for lexemes in levels `$signal`, `$error`
* **`Lexeme::is_error`**: true for lexemes in level `$error`
* **`Lexeme::is_signal`**: true for lexemes in level `$signal`
* **`Lexeme::is_user`**: true for lexemes that are not system lexemes

### Data Absorption, Data Reset


## To Do

* **`[—]`** can we replace `Level::new_token()` with a shorter API name?
  * **`[—]`** allow to declare tokens when calling `Level::new_token()`
* **`[—]`** allow positional arguments to `Level::new_token()`: `( name, fit, cfg )`
* **`[—]`** include indices for groups:

  ```
  match = 'a🈯z'.match /^(?<head>[a-z]+)(?<other>[^a-z]+)(?<tail>[a-z]+)/d
  { match.groups..., }
  { match.indices.groups..., }
  ```

* **`[—]`** rename result of `new_regex_tag` to reflect use of flags
* **`[—]`** allow for `token.fit`:
  * **`[—]`** functions?
    * must accept `( start, text, { token, level, grammar, } )`
    * must return `null` or a lexeme
  * **`[+]`** strings
* **`[—]`** allow different metrics (code units, code points, graphemes) to determine `lexeme.length`, which
  lexeme gets returned for `Level::match_longest_at()`; compare:
  ```
  help 'Ωilxt_416', Array.from 'a🈯z'
  help 'Ωilxt_417', 'a🈯z'.split /(.)/u
  help 'Ωilxt_418', 'a🈯z'.split( /(.)/v )
  help 'Ωilxt_419', 'a🈯z'.split( /(.)/d )
  help 'Ωilxt_420', match = 'a🈯z'.match /^(?<head>[a-z]+)(?<other>[^a-z]+)(?<tail>[a-z]+)/d
  help 'Ωilxt_421', { match.groups..., }
  help 'Ωilxt_422', { match.indices.groups..., }
  # help 'Ωilxt_423', rx"."
  # help 'Ωilxt_424', rx/./
  ```
* **`[—]`** move `fqname` formation to token, use API
* **`[—]`** implement API to test whether lexing has finished
* **`[—]`** write tests to ensure all of the Five Scanner Constraints hold:
  * **`[+]`** exhaustiveness
  * **`[—]`** compactness
  * **`[—]`** contiguity
  * **`[—]`** bijection
  * **`[—]`** monotony
    * **`[+]`** loop detection
* **`[—]`** based on the Five Scanner Constraints, can we set an upper limit to the number of steps
  necessary to scan a given source with a known (upper limit of) number codepoints? Does it otherwise fall
  out from the implemented algorithm that we can never enter an infinite loop when scanning?
* **`[—]`** implement proper type handling with ClearType
* **`[—]`** unify handling of `cfg`; should it always / never become a property of the instance?
* **`[–]`** should `Level`s and `Token`s get props `is_error`, `is_signal`, `is_system`, `is_user`?
* **`[—]`** implement a `select()` method somewhere that formalizes matching against lexemes
* **`[—]`** implement API to check whether errors occurred
* **`[—]`** implement `lexeme.terminate` to cause scanning to stop
* **`[—]`** build lexer for EffString specs
* **`[—]`** implement callbacks to e.g. cast data items to target values (as in `data: { count: '4', }` ->
  `data: { count: 4, }`)
* **`[—]`** when a token declares `emit: false` but matches some material, there will be holes in the scan
  that violate parts of the Five Scanner Constraints; how to deal with that?
* **`[—]`** reconsider zero-length matches: when a token has matched the empty string, accept that token
  and—if the token has no jump—try the next token on the same level, if any; stop with the current level at
  the first token that either matches material, or has a jump, or both. This should become the new default
  strategy (next to `first` and `longest`)
* **`[—]`** document `cast` setting for `Grammar::`, `Level::`, `Token::`
* **`[—]`** ? allow `cast` to be an object whose keys are functions that will be applied to properties of
  `Lexeme::data`; ex.: `{ fit: /(?<num>[0-9]+):(?<den>[0-9]+)/, cast: { num: parseInt, den: parseInt, }, }`
* **`[—]`** implement:
  * **`[—]`** `Grammar::reset: ({ lnr: 1, data: null, }) ->`
  * **`[+]`** `reset_lnr: ( lnr = 1 ) ->`
  * **`[—]`** `reset_data: ( data = null ) ->`
  * **`[—]`** `grammar_cfg.reset_on_scan.lnr`: `integer` or `boolean`
  * **`[—]`** `grammar_cfg.reset_on_scan.data`:
    * **`[—]`** default to `false` to skip resetting
    * **`[—]`** `null`, `true`, `{}` to reset to empty
    * **`[—]`** template object, functions will be called
    * **`[—]`** use ClearType to implement as type
  * **`[—]`** `grammar_cfg = { absorb_data: false, }` (also `true`)
* **`[—]`** implement `reserved` characters:
  * **`[—]`** allow lexemes to announce 'reserved' / 'forbidden' / 'active' characters (such as `<` that signals
    start of an HTML tag) that can later be used to formulate a fallback pattern to capture otherwise
    unmatched text portions
    * **`[—]`** at any point, allow to construct a pattern that *only* matches reserved characters and a pattern
      that matches anything *except* reserved characters
  * **`[—]`** modify behavior of catchall and reserved:
    * **`[—]`** catchall and reserved are 'declared', not 'added', meaning they will be created implicitly when
      `_finalize()` is called
    * **`[—]`** catchall and reserved alway come last (in this order)
    * **`[—]`** documentation (DRAFT):
      ## Reserved and Catchall Lexemes

      Each lexeme can announce so-called 'reserved' characters or words; these are for now restricted to strings and
      lists of strings, but could support regexes in the future as well. The idea is to collect those characters
      and character sequences that are 'triggers' for a given lexeme and, when the mode has been defined, to
      automatically construct two lexemes that will capture

      * all the remaining sequences of non-reserved characters; this is called a *catchall* lexeme (whose default
        TID is set to `$catchall` unless overriden by a `lxid` setting). The catchall lexeme's function lies in
        explicitly capturing any part of the input that has not been covered by any other lexemer higher up in the
        chain of patterns, thereby avoiding a more unhelpful `$error` token that would just say 'no match at
        position so-and-so' and terminate lexing.

      * all the remaining *reserved* characters (default TID: `$reserved`); these could conceivably be used to
        produce a list of fishy parts in the source, and / or to highlight such places in the output, or, if one
        feels so inclined, terminate parsing with an error message. For example, when one wants to translate
        Markdown-like markup syntax to HTML, one could decide that double stars start and end bold type
        (`<strong>...</strong>`), or, when a single asterisk is used at the start of a line, indicate unordered
        list items (`<ul>...<li>...</ul>`), and are considered illegal in any other position except inside code
        stretches and when escaped with a backslash. Such a mechanism can help to uncover problems with the source
        text instead of just glancing over dubious markup and 'just do something', possibly leading to subtle
        errors.




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
* **`[+]`** rename `simplify_jumps` -> `merge_jumps`
* **`[+]`** implement `Lexeme::pos` property to represent `lnr`, `start`, `stop` as text
* **`[+]`** implement lexeme <del>consolidation / simplification</del> <ins>merging</ins> where all
  contiguous lexemes with the same `fqname` are aggregated into a single lexeme (ex. `{ name: 'text',
  matcher: rx.i"\\[0-9]|[a-z\s]+", }` will issue tokens for hits `'R'`, `'\\2'`, `'D'`, `'\\2'` when
  scanning `'R\\2D\\2'`; simplification will reduce these four lexemes to a single lexeme)
  * **`[+]`** clarify how to treat entries in `Lexeme::data` when merging
  * **`[+]`** at first implement using `Object.assign()`, later maybe allow custom function
  * **`[+]`** later maybe allow custom function
* **`[+]`** unify `Lexeme::groups`, `Lexeme::data`
* **`[+]`** rename `Token::matcher` to `.fit()`?
* **`[+]`** <del>option to throw or</del> emit error in case lexing is unfinished
* **`[+]`** allow empty matches provided the token defines a jump
* **`[+]`** ensure `$signal.stop` is emitted in any case (barring exceptions)
* **`[+]`** emit `$signal.error` upon premature eod-of-scan
* **`[+]`** consider to rename `Grammar::walk_lexemes()` to `Grammar::scan()`
* **`[+]`** implement infinite loop prevention; levels; each level keeps track of positions, complains when
  re-visiting position (which violates the "no two visits" principle)
  * **`[+]`** notify all levels when scanning starts to reset any state
* **`[+]`** implement `discardable`, `ghost` tokens, especially for zero-length jumpers? Could use CFG
  setting `Token::emit`, in line with `Grammar::emit_signals`
* **`[+]`** simplify jump signals to <del>`data: { to: Level::name, }`</del> <ins>`data: { target:
  Level::name, }`</ins>
* **`[+]`** stop scanning when encountering error signal
* **`[+]`** among the Five Scanner Constraints, monotony can be defined in a stricter way, namely, that you
  can only enter a level at a given position once; the second time you enter a given level (by moving
  forewards or backwards), the current position (`lexeme.start`) must be at least `1` greater than your
  previous entry point
* **`[+]`** take error signals out of `$signal` and put into new `$error` level? That would entail instead
  of, say, `{ fqname: '$signal.error', data: { kind: 'earlystop', ..., } }` we would get `{ fqname:
  '$error.earlystop', data: { ..., } }` which is more suitable for processing
* **`[+]`** these internal settings / convenience values should be systematized and maybe collected in a
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
* **`[+]`** an infinite loop can result from zero-length matches and ensuing forth-and-back jumps which
  should be recognized and terminated
* **`[+]`** `Lexeme`s could gain properties
  * **`[+]`** `::is_system` for lexemes in levels starting with `$`
  * **`[+]`** `::is_error` for lexemes in level `$error`
  * **`[+]`** `::is_signal` for lexemes in level `$signal`
  * **`[+]`** `::is_user`  for lexemes in user-defined levels
* **`[+]`** implement option to turn exceptions into error signals
  * **`[+]`** `Grammar.cfg.loop_errors: {'emit'|'throw'}`
  * **`[+]`** `Grammar.cfg.earlystop_errors: {'emit'|'throw'}`


## Don't

* **`[—]`** <del>'wrap' tokenizing so that handling of line splitting, line numbering is isolated yet
  transparent</del>
* **`[—]`** <del>use syntax as before (`[level`, `..]` vs `level[`, `]..`)</del>
* **`[—]`** <del>implement 'inclusive' ('progressive'), 'exclusive' ('regressive') jumps</del>
  * **`[—]`** <del>allow to configure grammar defaults for fore- and backward jumps</del>
* **`[—]`** <del>bundle `start`, `stop` and later `lnr` &c under `position`?</del>
* **`[—]`** <del>can we put the functionalities of `Grammar::_scan_1b_merge_jumps()` and
  `Grammar::_scan_3_merge()` into a single method?</del>
* **`[—]`** <ins>replaced by option to replace exceptions with error signals</ins> <del>allow the lexer to stop 'silently' when a non-jump token matched the empty string? Add token
  declaration field `allow_empty_end`? Better name?</del>
* **`[–]`** <del>flatten `jump` property?</del>
* **`[—]`** <del>what should the `action` of a merged jumped be?</del>
