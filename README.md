
# InterLex


<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [InterLex](#interlex)
  - [To Do](#to-do)
  - [Is Done](#is-done)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->



# InterLex


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

## Is Done

* **`[+]`** implement chunk numbering with CFG settings `{ counter_name: 'line_nr', counter_start: 1, }`

<!-- ## Don't -->

