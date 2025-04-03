# CleanSight

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Fcleansight)

A proxy service that transforms web content into clean, readable formats optimized for AI context windows. Inspired by 12ft.io but focused on creating AI-friendly text.

## Features

- Removes ads, navigation, boilerplate and other unnecessary content
- Converts complex HTML to clean markdown, plain text, or JSON
- Preserves essential content while reducing token usage
- Simple API for integration with AI agents and applications
- In-memory caching for performance

## Demo

Visit [https://cleansight.vercel.app](https://cleansight.vercel.app) to try it out.

## API Usage

### Endpoint

```
GET /proxy?url=https://example.com&format=markdown
```

### Parameters

- `url` (Required): The URL of the web page to process
- `format` (Optional): Output format
  - `markdown` (default): Clean markdown content
  - `text`: Plain text content
  - `html`: Clean HTML content
  - `json`: Complete article object with metadata

## Self-hosting

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Fcleansight)

### Manual Setup

```bash
# Clone the repository
git clone https://github.com/your-username/cleansight.git
cd cleansight

# Install dependencies
npm install

# Start the server
npm start
```

## Development

```bash
# Run with auto-reload
npm run dev
```

## Docker

```bash
# Build the image
docker build -t cleansight .

# Run the container
docker run -p 3333:3333 cleansight
```

## How It Works

1. The service fetches the requested web page
2. Mozilla's Readability library extracts the main content
3. Content is cleaned and converted to the requested format
4. Results are cached for improved performance

## Integration Ideas

- Add to your LLM prompt templates to fetch reference content
- Use with automated research workflows
- Integrate with RAG systems to improve document ingestion
- Use as a personal clean-reading mode for any website

## Technologies

- Express.js - Web server
- Mozilla Readability - Content extraction
- Turndown - HTML to Markdown conversion
- JSDOM - DOM parsing
- Node-Cache - In-memory caching

## License

MIT
