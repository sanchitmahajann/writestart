import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import https from 'https';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')))


// Serve the HTML form
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/public/form.html'));
});



app.post('/scrape', (req, res) => {
  const { url } = req.body;

  const client = url.startsWith('https') ? https : http;

  client.get(url, (response) => {
    let data = '';

    if (response.statusCode !== 200) {
      res.status(500).json({ error: `Failed to fetch ${url}: ${response.statusCode}` });
      return;
    }
    response.on('data', (chunk) => {
      data += chunk;
    });
    response.on('end', () => {
      const $ = cheerio.load(data);

      const visibleTexts = [];
      $('h1, h2, h3, h4, h5, h6, p, a, li, span, div').each((_, element) => {
        const text = $(element).text().trim();
        if (text) {
          visibleTexts.push(text);
        }
      });

      const textContent = visibleTexts.join(', ');
      const prompt = `Extract the following information from the text: company name, type of product, ideal user.\n\n${textContent}`;
      makeOpenAICall(prompt)
        .then(result => {
          const extractInfo = (text, key) => {
            const regex = new RegExp(`${key}:\\s*(.+)`, 'i');
            const match = text.match(regex);
            return match ? match[1].trim() : 'Not found';
          };

          const companyName = extractInfo(result, 'Company name');
          const productName = extractInfo(result, 'Type of product');
          const idealUser = extractInfo(result, 'Ideal user');
          const extractedInfo = {
            companyName: companyName,
            typeOfProduct: productName,
            idealUser: idealUser
          };

          res.json({ extractedInfo });
        })
        .catch(error => {
          console.error('Error:', error);
          res.status(500).json({ error: 'Failed to process OpenAI request' });
        });
    });

  }).on('error', (error) => {
    console.error('HTTP request error:', error);
    res.status(500).json({ error: 'Failed to scrape the webpage or extract information' });
  });
});



app.post('/generate', async (req, res) => {
  const { companyName, productName, idealUser } = req.body;
  if (!companyName || !productName || !idealUser) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  const generatedContent = await generateContent(companyName, productName, idealUser);
  res.json({ generatedContent });
});



process.on('SIGINT', () => {
  console.log("Shutting down server...");
  process.exit();
});




async function makeOpenAICall(prompt, retries = 3) {
  try {
    const payload = {
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: `${prompt}\n\n` }
      ]
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      if (response.status === 429 && retries > 0) {
        console.log('Rate limit exceeded, retrying in 5 seconds...');
        await sleep(5000);  // Wait for 5 seconds before retrying
        return makeOpenAICall(prompt, retries - 1);
      } else {
        const errorData = await response.json();
        console.error('Error:', errorData);
        throw new Error(errorData);
      }
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateTweets(companyName, productName, idealUser) {
  const prompt = `
    Write the first 2 Tweets for my company ${companyName}. Just list the tweets. Don't say "here are tweets" or anything similar. Generate in basic markdown with titles being bold with **. The whole content should not be bold, only the title sentence.
    Our main product revolves around ${productName} and the ideal user is ${idealUser}. Do not use Emojis.
    Rules:
    1. Tweet 1 should be about the launch
    2. Tweet 2 should be about the problem the product solves
    3. Tweet 3 should be about how the product solves the problem
    4. Tweet 4 should be about testimonials
    5. Tweet 5 should be funny and engaging content
   
  `;

  const response = await makeOpenAICall(prompt);
  return response;
}

// Function to generate Instagram posts
async function getPosts(companyName, productName, idealUser) {
  const prompt = `
    Write the first 2 Instagram posts for my company ${companyName} in the format:
    1. Caption
    2. Slide 1 Content
    3. Slide 2 Content
    Our main product revolves around ${productName} and the ideal user is ${idealUser}.
    Each post idea should have a newline space between it so that the written content is visible in an organised way. Don't say "markdown" at the beginning. Don't say "here are instagram" or anything similar. Generate in basic markdown with titles being bold with **. Do not use emojis.
  `;

  const response = await makeOpenAICall(prompt);
  return response;
}

async function getBlogs(companyName, productName, idealUser) {
  const prompt = `
    Write the first 2 blogs for my company ${companyName}.
    Our main product revolves around ${productName} and the ideal user is ${idealUser}.
    Don't say "here are blogs" or anything similar. It should be 200 words long. There needs to be a visible difference in each blog post. Generate in basic markdown with titles being bold with **.
  `;

  const response = await makeOpenAICall(prompt);
  return response;
}


async function generateContent(companyName, productName, idealUser) {
  try {

    const tweets = await generateTweets(companyName, productName, idealUser);

    const posts = await getPosts(companyName, productName, idealUser);

    const blogs = await getBlogs(companyName, productName, idealUser);



    const content = {
      "tweets": tweets,
      "posts": posts,
      "blogs": blogs
    }

    return content;
  } catch (error) {
    console.error('Error generating content:', error);
    throw error;
  }
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});


export default app;