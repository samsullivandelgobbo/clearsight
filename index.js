const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const TurndownService = require('turndown');
const NodeCache = require('node-cache');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const winston = require('winston');

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Initialize express app
const app = express();
const port = process.env.PORT || 3333;
const cacheTTL = parseInt(process.env.CACHE_TTL, 10) || 3600;
const cache = new NodeCache({ stdTTL: cacheTTL }); // Cache TTL in seconds

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW, 10) || 15 * 60 * 1000, // Default: 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100, // Default: 100 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again later'
});

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS for all routes
app.use(express.json());
app.use(limiter); // Apply rate limiting to all requests

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl
  });
  res.status(500).json({
    error: 'An unexpected error occurred',
    requestId: req.id
  });
});

// Simple home page with better UI
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>CleanSight - Web Content for AI</title>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/water.css@2/out/water.css">
      <style>
        :root {
          --primary-color: #2563eb;
          --primary-hover: #1d4ed8;
          --bg-color: #f8fafc;
          --text-color: #1e293b;
        }
        
        body {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
          background: var(--bg-color);
          color: var(--text-color);
          line-height: 1.6;
        }
        
        .container {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }
        
        h1 {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          color: var(--primary-color);
        }
        
        .tagline {
          font-size: 1.2rem;
          opacity: 0.9;
          margin-bottom: 2rem;
        }
        
        .demo-form {
          margin: 2rem 0;
        }
        
        form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        input[type="url"], select {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 1rem;
        }
        
        button {
          background: var(--primary-color);
          color: white;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        button:hover {
          background: var(--primary-hover);
        }
        
        .api-section {
          margin-top: 3rem;
          padding-top: 2rem;
          border-top: 1px solid #e2e8f0;
        }
        
        code {
          background: #f1f5f9;
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          font-size: 0.9rem;
        }
        
        .footer {
          margin-top: 3rem;
          text-align: center;
          opacity: 0.8;
          font-size: 0.9rem;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>CleanSight</h1>
        <p class="tagline">Transform web content into clean, readable formats optimized for AI consumption.</p>

        <div class="demo-form">
          <h2>Try it out</h2>
          <form action="/proxy" method="get">
            <div>
              <label for="url">Enter a webpage URL:</label>
              <input 
                type="url" 
                id="url" 
                name="url" 
                placeholder="https://example.com" 
                required
              >
            </div>
            
            <div>
              <label for="format">Select output format:</label>
              <select id="format" name="format">
                <option value="markdown">Markdown</option>
                <option value="text">Plain Text</option>
                <option value="html">Clean HTML</option>
                <option value="json">JSON with Metadata</option>
              </select>
            </div>
            
            <button type="submit">Clean URL</button>
          </form>
        </div>

        <div class="api-section">
          <h2>API Usage</h2>
          <code>GET /proxy?url=https://example.com&format=markdown</code>
          
          <h3>Parameters</h3>
          <ul>
            <li><strong>url</strong> (Required): The URL of the web page to process</li>
            <li><strong>format</strong> (Optional): Output format
              <ul>
                <li><code>markdown</code> (default): Clean markdown content</li>
                <li><code>text</code>: Plain text content</li>
                <li><code>html</code>: Clean HTML content</li>
                <li><code>json</code>: Complete article object with metadata</li>
              </ul>
            </li>
          </ul>
        </div>

        <div class="footer">
          <p>Made for AI context windows. Fork on <a href="https://github.com/your-username/cleansight">GitHub</a>.</p>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Main proxy endpoint with improved error handling
app.get('/proxy', async (req, res) => {
  const startTime = Date.now();
  const { url, format = 'markdown' } = req.query;

  try {
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    // Validate format
    const validFormats = ['text', 'markdown', 'html', 'json'];
    if (!validFormats.includes(format)) {
      return res.status(400).json({
        error: 'Invalid format',
        validFormats
      });
    }

    // Check cache first
    const cacheKey = `${url}:${format}`;
    const cachedContent = cache.get(cacheKey);

    if (cachedContent) {
      logger.info('Cache hit', { url, format, responseTime: Date.now() - startTime });
      return sendResponse(res, cachedContent, format);
    }

    // Fetch the webpage with timeout
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      timeout: 10000 // 10 second timeout
    });

    // Parse the HTML
    const dom = new JSDOM(response.data, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      logger.warn('Failed to parse content', { url });
      return res.status(422).json({ error: 'Could not parse content from the provided URL' });
    }

    // Process the content based on the requested format
    let content;

    if (format === 'text') {
      content = article.textContent;
    } else if (format === 'markdown') {
      const turndownService = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
        bulletListMarker: '-'
      });

      // Custom rules for better formatting
      turndownService.addRule('fixCodeBlocks', {
        filter: ['pre', 'code'],
        replacement: function (content, node) {
          if (node.nodeName === 'PRE') {
            return '\\n```\\n' + content + '\\n```\\n';
          }
          return '`' + content + '`';
        }
      });

      content = turndownService.turndown(article.content);
    } else if (format === 'html') {
      content = article.content;
    } else if (format === 'json') {
      content = {
        title: article.title,
        byline: article.byline,
        content: article.content,
        textContent: article.textContent,
        siteName: article.siteName,
        excerpt: article.excerpt,
        length: article.textContent.length,
        processedAt: new Date().toISOString()
      };
    }

    // Cache the result
    cache.set(cacheKey, content);

    // Log success
    logger.info('Content processed successfully', {
      url,
      format,
      contentLength: typeof content === 'string' ? content.length : JSON.stringify(content).length,
      responseTime: Date.now() - startTime
    });

    // Send the response
    sendResponse(res, content, format);
  } catch (error) {
    let errorMessage = 'Failed to process the URL';
    let statusCode = 500;

    if (error.code === 'ECONNABORTED') {
      errorMessage = 'Request timed out while fetching the URL';
      statusCode = 504;
    } else if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      errorMessage = 'Source server responded with status ' + error.response.status + '`';
      statusCode = error.response.status === 404 ? 404 : 502;
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage = 'No response received from the source server';
      statusCode = 502;
    }

    logger.error('Error processing URL', {
      url,
      error: error.message,
      statusCode,
      stack: error.stack,
      responseTime: Date.now() - startTime
    });

    res.status(statusCode).json({
      error: errorMessage,
      details: error.message
    });
  }
});

// Helper function to send response in proper format
function sendResponse(res, content, format) {
  if (format === 'json') {
    res.json(content);
  } else if (format === 'html') {
    res.setHeader('Content-Type', 'text/html');
    res.send(content);
  } else {
    res.setHeader('Content-Type', 'text/plain');
    res.send(content);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  app.listen(port, () => {
    logger.info(`CleanSight server running at http://localhost:${port}`);
  });
}

// Export for testing
module.exports = app;