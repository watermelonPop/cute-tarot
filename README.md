- React + TypeScript + Vite
- Using the tarot-api for most information & random draws
- See it at https://github.com/ekelen/tarot-api


# users
- id
- email
- picture
- readings (ids)
- selected_deck (id)


# cards
- id
- type
- value (number)
- name
- name_short
- meaning_up (upright)
- meaning_rev (reversed)
- descriptions

# decks
- id
- name
- images

# relations
- id
- cards (ids)
- desc

# readings
- id
- cards (ids)
- spread
- relations (ids)
- reversals (bool)

# routes

## user routes
- GET user by id
- GET user by email
- POST user
- POST reading for user

## card routes
- GET card by id
- GET card by name_short
- POST description for card

## deck routes
- GET deck by id
- GET deck by name
- POST deck
- POST description to deck

## relation routes
- GET relation by cards
- GET relation by id
- POST relation

## reading routes
- GET reading by id
- POST reading


# spreads used
- 1 card tarot spread for focused questions
- 3 card spread -- past, present, future

- 


# pages:
- cards
    - search
    - filter
    - inner page for 1 card
- relations:
    - match maker feature
    - regular search
    - regular filters
    - inner page for 1 relation
- decks
    - see all decks
    - set account deck
    - inner page for 1 deck
- spreads
    - see all spreads
    - inner page for 1 spread
- readings
    - see all account readings
    - create new reading