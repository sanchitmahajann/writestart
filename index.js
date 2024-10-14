require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const puppeteer = require("puppeteer");
const axios = require('axios');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve the HTML form
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'form.html'));
});

app.post('/scrape', async (req, res) => {
  const { url } = req.body;
  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { timeout: 1200000 });

    const visibleTexts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6, p, a, li, span, div"))
        .filter((element) => element.offsetWidth > 0 && element.offsetHeight > 0)
        .map(element => element.innerText.trim());
    });

    console.log('Visible texts:', visibleTexts);
    const textContent = visibleTexts.filter(Boolean).join(', ');
    fs.writeFileSync('scraped_text.txt', textContent);

    const prompt = 'Extract the following information from the text: company name, type of product, ideal user.\n\n';

    const result = await makeOpenAICall(prompt);

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
    console.log(extractedInfo);
    // Send both extracted info and generated content back to the client
    res.json({ extractedInfo });
    await browser.close();



  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to scrape the webpage' });
  }
});

app.post('/generate', async (req, res) => {
  const { companyName, productName, idealUser } = req.body;
  // Validate that all required parameters are present
  if (!companyName || !productName || !idealUser) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  // Send both extracted info and generated content back to the client
  const generatedContent = await generateContent(companyName, productName, idealUser);
  res.json({ generatedContent });
});

app.listen(3002, () => {
  console.log('Server is running on http://localhost:3002');
});

process.on('SIGINT', () => {
  console.log("Shutting down server...");
  process.exit();
});


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeOpenAICall(prompt, retries = 3) {
  try {
    const fileText = fs.readFileSync('scraped_text.txt', 'utf8');
    const payload = {
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: `${prompt}\n\nFile content:\n${fileText}` }
      ]
    };

    const response = await axios.post('https://api.openai.com/v1/chat/completions', payload, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    if (error.response && error.response.status === 429 && retries > 0) {
      console.log('Rate limit exceeded, retrying in 5 seconds...');
      await sleep(5000);  // Wait for 5 seconds before retrying
      return makeOpenAICall(prompt, retries - 1);
    } else {
      console.error('Error:', error.response ? error.response.data : error.message);
      throw error;
    }
  }
}


async function generateTweets(companyName, productName, idealUser) {
  const prompt = `
    Write the first 2 Tweets for my company ${companyName}. Just list the tweets. Don't say "here are tweets" or anything similar. Generate in basic markdown with titles being bold with **. The whole content should not be bold, only the title sentence.
    Our main product revolves around ${productName} and the ideal user is ${idealUser}.
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
    Each post idea should have a newline space between it so that the written content is visible in an organised way. Don't say "markdown" at the beginning. Don't say "here are instagram" or anything similar. Generate in basic markdown with titles being bold with **.
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

