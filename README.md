# Cute Tarot
## Deployment
https://cute-tarot.vercel.app/

## Introduction
Tarot reading has been such an important part of my life that I decided to learn it myself. But I discovered that gathering the information on card meanings and relationships is a beast of its own. I built this project to make the process easier! It brings everything together in one place: card meanings and relationships, tarot spreads, and a way to record and reflect on your readings over time. It also includes a tarot deck that I drew myself based on the Rider-Waite deck. As I continue buying and making new decks, I'll be adding them to the project! Please enjoy my labor of love!

## Tech Stack
### Front-end
 - React
 - Vite 
 - Typescript
### Back-end
 - Nodejs
 - Express
 - Prisma
 - postgreSQL
### Authentication
 - Google Oauth
### Production
 - Vercel
 - Neon

## Dependencies

 - Fontawesome
 - react router
 - html2pdf
 - googleoauth

## Features
### All Pages
Every page includes an information button that opens a modal describing the page's purpose and features.
### Cards Page
Displays all cards in the selected deck, organized by suit and value. Hovering over a card reveals its upright and reversed keywords. Clicking a card opens its dedicated Card page. The page also includes a text search bar and a suit filter dropdown. Use them individually or together to narrow results. The text search covers card titles, descriptions, meanings, and more. Hit the search button to run your query!

### Card Page
Shows all information for a specific card, including its image, keywords, description, and upright and reversed meanings. All content reflects the currently selected deck. Switching decks updates the image and information accordingly. An inspect button lets you view the card as a draggable 3D object. There's also a Search Relations button that opens the Relations page with the current card pre-loaded as the first selection.

### Relations Page
Explore the relationship between any two cards. Select cards for the two available slots, then click Enter to generate a description of their relationship, including any topic-specific meanings. For example, certain card pairs may carry a special meaning in the context of love and relationship readings.

### Decks Page
Displays all available decks. The currently selected deck is marked with a checkmark. Clicking a deck opens its dedicated Deck page.

### Deck Page
Shows a deck's name, description, and card images. Each deck comes with its own card art, descriptions, and site theme. Any user can switch decks, but only logged-in users will have their selection saved. Logged-out users will revert to the default Rider-Waite deck on refresh.

### Spreads Page
Displays all available tarot spreads. Clicking a spread opens its dedicated Spread page. Any spread can be selected when creating a reading.

### Spread Page
Shows all information for a specific spread, including its name, description, number of card pulls, and the label for each pull position. For example, the Past, Present, Future spread has three pulls representing each time period respectively.

### Readings Page
A tarot reading creator. Choose a spread, a topic type, and whether reversed cards are allowed. Card slots will populate based on the chosen spread. In manual mode, slots are clickable so you can input the cards you drew in real life. In virtual mode, cards are randomly generated for you. Once everything is set, click Get Reading to pull up detailed information about your reading using card and relation data from the database, complete with a clickable table of contents. The reading can be downloaded as a PDF at any time. Logged-in users have their readings automatically saved to their account. Logged-out users will lose the reading upon refresh or navigation. This reading generator is a research and recording tool, not a substitute for human intuition. No reading is complete without a human reader, and this feature is meant to help you gather and understand information about your cards, save your readings, and revisit them over time.

### Reading Page
Only accessible to logged-in users via their Account page. Displays the full saved reading with a clickable table of contents. A notes section at the bottom lets you add personal reflections. Click the edit notes button to write and save notes for the reading.

### Account Page
Displays your profile information and reading history when logged in, including your name, profile picture, email, and a list of all past readings. Clicking a past reading opens its Reading page. Logged-out users will see a prompt to log in.

## Front-end Routing
### Card Routes
| Route | Description |
|--|--|
| /cards | Goes to the client Cards page. Displays all cards in the currently selected deck, with search and filter features |
| /cards/:nameShort | Goes to the client Card page. Displays all information for the card with nameShort = :nameShort.|
| /cards/search/:searchText?/:suitFilter? | Goes to the client Search Cards page. Shows search results that match the search text and filters to only results with suit = :suitFilter.|
| /physical/:deckName/:cardNameShort | Goes to the client Physical Card page. This is a deck specific page for a card meant to connect to nfc cards. Shows page for the card with nameShort = cardNameShort and deck with name = deckName. Ex: I have the Bunny-Waite deck, and each card has an nfc tag sticker that corresponds to this page.|

### Account Routes
| Route | Description |
|--|--|
| /account | Goes to the client Account page.  Shows account information and past readings for logged-in users.|

### Relation Routes
| Route | Description |
|--|--|
| /relations | Goes to the client Relations page.  It allows the user to choose 2 cards from the selected deck and see the relationship between them.|
| /relations/:nameShort1 | Goes to the client Relations page with 1 card already selected, the card with nameShort = :nameShort1. Once a card is selected in /relations, the user is sent here.|
| /relations/relations/:nameShort1/:nameShort2 | Goes to the client Relations page with both cards already selected, the cards with nameShort = :nameShort1 & :nameShort2. Once the other card is selected in /relations/:nameShort1, the user is sent here.|

### Deck Routes
| Route | Description |
|--|--|
| /decks | Goes to the client Decks page.  Displays all decks in the database.|
| /decks/:deckName | Goes to the client Deck page.  Displays all information for the deck with name = :deckName.|

### Spread Routes
| Route | Description |
|--|--|
| /spreads | Goes to the client Spreads page.  Displays all tarot spreads in the database.|
| /spreads/:spreadId | Goes to the client Spread page.  Displays all information for the spread with id = :spreadId.|

### Reading Routes
| Route | Description |
|--|--|
| /readings | Goes to the client Readings page. Users can create a reading. Automatically saved to account if logged in.|
| /readings/:readingId | Goes to the client Reading page. Only accessible by logged in users through the past readings section of the account page. Shows all information for a reading with id = :readingId.|

## Back-end Routing
### User Routes
| Title | URL | Method | URL params | body params | Success response | Error responses
|--|--|--|--|--|--|--|
| Get All Users | /api/users | GET | none | none | 200: Array of user objects | none | 
| Check User By Email | /api/users/check | GET | none | none | 200: `{ exists: boolean, user_id?: string }` | 400: Email param required, 400: Invalid email format, 500: Internal server error | 
| Get User By ID | /api/users/:id | GET | id: string | none | 200: User object | 400: ID param required, 404: User not found, 500: Internal server error | 
| Create User | /api/users | POST | none | email: string (required), name: string (optional), picture: string (optional) | 201: Created user object | 400: Email required, 400: Invalid email format, 500: Default deck not found, 500: Internal server error | 
| Set User Deck | /api/users/setDeck | POST | none | userId: string (required), deckId: string (required) | 200: Updated user object | 400: userId and deckId required, 404: User not found, 500: Internal server error |

### Spread Routes
| Title | URL | Method | URL params | body params | Success response | Error responses
|--|--|--|--|--|--|--|
| Get All Spreads | /api/spreads | GET | none | none | 200: Array of spread objects | none | 
| Get Spreads By Pull Count | /api/spreads/cards/:numPulls | GET | numPulls: number | none | 200: Array of spread objects | none | 
| Get Spread By ID | /api/spreads/:id | GET | id: string | none | 200: Spread object | 400: ID param required, 404: Spread not found, 500: Internal server error | 
| Update Spread | /api/spreads/:spreadId/updateSpread | POST | spreadId: string | description: string | 200: Updated spread object | 404: Spread not found, 500: Internal server error |

### Relation Routes
| Title | URL | Method | URL params | body params | Success response | Error responses
|--|--|--|--|--|--|--|
| Get All Relations | /api/relations | GET | none | none | 200: Array of relation objects | 500: Internal server error | 
| Get Relation By ID | /api/relations/:relationId | GET | relationId: string | none | 200: Relation object | 400: ID param required, 404: Relation not found, 500: Internal server error | 
| Get Relations By Card ID | /api/relations/cardId/:cardId | GET | cardId: string | none | 200: Array of relation objects | 400: cardId param required, 404: Card not found, 404: No relations found, 500: Internal server error | 
| Get Relations By Card nameShort | /api/relations/nameShort/:nameShort | GET | nameShort: string | none | 200: Array of relation objects | 400: nameShort param required, 404: Card not found, 404: No relations found, 500: Internal server error | 
| Get Relations For N Cards | /api/relations/nCardRelations | POST | none | cardIds: string[] (min 2, required) | 200: `{ relations: relation[], relationIds: string[] }` | 400: cardIds invalid, 404: No relations found, 500: Internal server error | 
| Update Relation | /api/relations/:relationId/updateRelation | POST | relationId: string | description: string, descriptionAdvice: string, descriptionLove: string, descriptionCareer: string | 200: Updated relation object | 404: Relation not found, 500: Internal server error |

### Reading Routes
| Title | URL | Method | URL params | body params | Success response | Error responses
|--|--|--|--|--|--|--|
| Get Readings By User | /api/readings/user/:userId | GET | userId: string | none | 200: Array of reading objects | 400: userId required, 404: User not found, 500: Internal server error | 
| Get Reading By ID | /api/readings/:id | GET | id: string | none | 200: Reading object | 400: ID required, 404: Reading not found, 500: Internal server error | 
| Draw Virtual Reading | /api/readings/draw | POST | none | userId: string (required), spreadId: string (required), reversals: boolean (optional), topic: string (optional), name: string (optional) | 201: Created reading object | 400: userId required, 404: User not found, 404: Spread not found, 500: Internal server error | 
| Update Reading Notes | /api/readings/:id/updateNotes | POST | id: string | notes: string (required) | 200: Updated reading object | 400: ID required, 400: Notes required, 404: Reading not found, 500: Internal server error | 
| Create Manual Reading | /api/readings | POST | none | userId: string (required), spreadId: string (required), cardIds: string[] (required), reversals: boolean (optional), reversalValues: boolean[] (required if reversals true), topic: string (optional), name: string (optional), date: string (optional) | 201: Created reading object | 400: userId required, 400: spreadId required, 400: cardIds required, 400: Card/reversal count must match spread, 404: User not found, 404: Spread not found, 500: Internal server error |

### Deck Routes
| Title | URL | Method | URL params | body params | Success response | Error responses
|--|--|--|--|--|--|--|
| Get All Decks | /api/decks | GET | none | none | 200: Array of deck objects | 500: Internal server error | 
| Get Deck By ID | /api/decks/:id | GET | id: string | none | 200: Deck object | 400: ID required, 404: Deck not found, 500: Internal server error | 
| Get Deck Images | /api/decks/:id/images | GET | id: string | none | 200: `{ [cardNameShort]: imageUrl, "card-back": imageUrl }` | 400: ID required, 404: Deck not found, 500: Images not configured, 500: Image base paths missing, 500: Internal server error | 
| Update Deck | /api/decks/:deckId/updateDeck | POST | deckId: string | description: string, style: string | 200: Updated deck object | 404: Deck not found, 500: Internal server error |

### Card Routes
| Title | URL | Method | URL params | body params | Success response | Error responses
|--|--|--|--|--|--|--|
| Get All Cards | /api/cards | GET | none | none | 200: Array of card objects | none | 
| Get All Card namesShort | /api/cards/namesShort | GET | none | none | 200: Array of strings | none | 
| Search Cards | /api/cards/search | GET | query: string (query param) | none | 200: Array of card objects | 400: Query param required, 500: Internal server error | 
| Get Card By nameShort | /api/cards/:nameShort | GET | nameShort: string | none | 200: Card object | 400: nameShort required, 404: Card not found, 500: Internal server error | 
| Draw Random Cards | /api/cards/draw/:numDrawn/:reversed | GET | numDrawn: number, reversed: boolean | none | 200: `{ cards: string[], reversed?: boolean[] }` | 400: numDrawn must be positive integer, 400: Cannot draw more cards than deck size, 500: No cards in deck, 500: Failed to draw unique cards, 500: Internal server error | 
| Update Card | /api/cards/:cardId/updateCard | POST | cardId: string | meaningUp: string, meaningRev: string, keywordsUp: string, keywordsRev: string, meaningAdvice: string, meaningLove: string, meaningCareer: string, meaningYesNo: string, descriptions: object | 200: Updated card object | 404: Card not found, 500: Internal server error |

## References
All data on cards, card relations, and images was gathered from these sources:
 - https://www.astrology.com/
 - https://labyrinthos.co/
 - https://www.mysticdoorway.com/
 - https://steve-p.org/cards/RWSa.html