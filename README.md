# Better Habr

A userscript that improves the user experience on Habr.com by adding various enhancements and features.

## Features

- **Article Rating**:
  - Displays the article rating in the browser tab title.
  - Colorizes the article header (green for positive, red for negative) and appends the score.
- **Table of Contents (Outliner)**:
  - Generates a floating table of contents for articles based on headers.
  - Allows easy navigation within the article.
- **Comments Sorter**:
  - Sorts comments by rating (descending).
  - Includes functionality to reveal hidden comment ratings before sorting.

## Installation

1. Install a userscript manager like [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).
2. [Click here to install](https://github.com/ilyachch-userscripts/better-habr/raw/main/better-habr/dist/better-habr.user.js).

## Development

Prerequisites:
- [Node.js](https://nodejs.org/)
- [npm](https://www.npmjs.com/)

```bash
# Install dependencies
npm install

# Start dev server (with HMR)
npm run dev

# Build for production
npm run build
```

## License

Distributed under the MIT License. See `LICENSE` for more information.
