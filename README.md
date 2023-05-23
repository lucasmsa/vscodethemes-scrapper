# 🞼 Vscode Themes Crawler
This is a web scraping project that is designed to get images from the [Vscode Themes website](https://vscodethemes.com/). It processes the pages, retrieves the themes images, and uploads them to an Amazon S3 bucket. It's built with Node.js and Typescript, using Puppeteer for the web scraping tasks.

### 🞜 Purpose
The main goal of this project is to fetch vscode theme images based on its 7 different programming languages available on the website. It cycles through different pages on the Vscode Themes website, retrieves the themes' images, processes and stores them to a specified S3 bucket separating the folders based on the theme. This project contains the data collection part for a bigger project that will use the images to train a machine learning model 🤖

### ♞ Technologies
The following technologies were used for this project:

⏣ **Node.js** with **Typescript**

⏣ **Puppeteer**: For web scraping tasks, to manipulate the webpage and extract data

⏣ **AWS SDK**: To interact with Amazon Web Services, particularly to upload files to an S3 bucket

⏣ **Jest**: Used as the testing framework, all of the application's features were unit tested

⏣ **ESLint** and **Prettier**: Used to maintain consistency and format the code

### ⌘ How to run
⏣ First, you need to set up the environment variables. Create a .env file in the root directory with the following structure (described also on the `.env.example` file):

```
AWS_ACCESS_KEY=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=your_region
BUCKET_NAME=your_bucket_name
```

⏣ Then, run the following commands (if you don't have yarn installed, you can use npm instead) to install and run the project:
```
$ yarn add

$ yarn run dev
```

### ✐ Testing 
To run the tests, use the following command:
```
$ yarn run test
```

#### ☄︎ Final Thoughts
This project is an excellent example of how you can combine various technologies to build a simple yet effective web crawler. It's also a great starting point for anyone looking to dive deeper into the world of web scraping or to learn more about interacting with Amazon Web Services.