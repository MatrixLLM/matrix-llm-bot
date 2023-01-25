# Matrix-LLM


<span>
<img src="assets/matrix-llm.png" align="left" style="width:100px;height: 100px; margin: 20px;">
<br>

A bot to allow you to use Matrix to communicate with LLM's (for example ChatGPT).

This bot will require [matrix-llm-api](https://github.com/matrixllm/api) but for now it embeds [node-chatgpt-api](https://github.com/waylaidwanderer/node-chatgpt-api).

</span>

<br clear="both">

## Setup Matrix Bot

Set ACCESS_TOKEN if available or set LOGINNAME & PASSWORD and follow instructions in error message.

- `cp .env.example .env` and set values.

If you want to use the embedded matrix-llm-api:

- `cp llm-settings.js.example llm-settings.js` and set values.

You now have two options (or you can use a mixture of both)

### Run with Docker

The easiest way to get started is using Docker to run both the embedded matrix-llm-api and the bot.

- `docker-compose up -d --build llm-api` to start the embedded API.
- `docker-compose up -d --build matrix-llm-bot` to start the bot.
- `docker-compose logs --follow` to see logs, ctrl+c to exit (bot & api keep running).

If you make changes to the code you need to run the 1st command below before building the Docker image.

### Run without Docker

You can use the 1st command above to run the embedded matrix-llm-api using Docker if you prefer.

- `npm install` to install dependencies.
- `npm dev` for development, or `npm start` in production.

## NPM commands

The following NPM commands are available when not using Docker:

|    npm run   |                   function                 |
| ------------ | ------------------------------------------ |
| start        | Run build/index.js                         |
| dev          | Run & watch app/index.ts                   |
| build        | Build app/ into build/                     |

## Structure
- [app/](app/)
    - [index.ts](app/index.ts): basic boilerplate for the bot client.
    - [llm.ts](app/llm.ts): handles all LLM specific stuff.
    - [settings.ts](app/settings.ts): see here for reference of bot settings.
- [assets/](assets/): Images (and an image script) for use in the README.
- *build/*: Made during runtime. Compiled javascript code.
- *.env*: Manually made. Environment variables to use when running locally.
- *llm-settings.js*: Manually made. These are the settings that will be passed by matrix-llm-api

## License
This template is in the [public domain](LICENSE). Matrix-Bot-Starter is licensed under the [MIT License](https://github.com/matrixllm/Matrix-Bot-Starter/blob/main/LICENSE).

